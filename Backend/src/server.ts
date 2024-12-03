import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validateUser, handleValidationErrors } from './middlewares/validationMiddleware';  
import {Authorize} from './middlewares/authosize'
const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000; 
import dotenv from 'dotenv';
import { sendOtp } from "./otpService";
dotenv.config({ path: '../.env'});

app.use(express.json());
interface CustomRequest extends Request {
    user?: {
      userId: number;
      email: string;
      role: string
    };
}
  
  
const authorize = (req: CustomRequest, res: Response, next: Function) => {
    const token = req.headers['authorization']?.split(' ')[1];

    console.log("Received Token:", token);  
    if (!token) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        console.log("Decoded Token:", decoded);   
        req.user = decoded as { userId: number; email: string, role:string,mobileNumber?: string; };
        console.log("User from decoded token:", req.user);  
        
        next();
    });
};

app.post('/signup', [...validateUser, handleValidationErrors], async (req: Request, res: Response): Promise<void> => {
  const { name, mobileNumber, email, password, role } = req.body;
  try {
    const existingUser = await prisma.user.findFirst({ 
      where: {
        OR: [
          { mobileNumber },
          { email }
        ]
      }
    });
    if (existingUser) {
      res.status(400).json({ message: "User already exists. Please login." });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000); 
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);  
    await sendOtp(mobileNumber, otp);
 
    const user = await prisma.user.create({
      data: {
        name,
        mobileNumber,
        email,
        password: password ? await bcrypt.hash(password, 10) : null,
        role,
        otp: otp.toString(),
        otpExpiry,
      }
    });

    res.status(201).json({ message: 'OTP sent to your mobile number.' });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
});

app.post('/verify-otp',async (req:Request,res:Response):Promise<void>=>{
  const {mobileNumber,otp}=req.body;
  try{
    const user = await prisma.user.findUnique({where:{mobileNumber}});
    if(!user||user.otp != otp){
      res.status(400).json({message:'Invalid OTP or Mobile Number.'});
      return;
    }
    const otpExpiry = new Date(user.otpExpiry!);
    if (otpExpiry < new Date()) {
      res.status(400).json({ message: 'OTP has expired.' });
      return;
    }
 
    const token = jwt.sign(
      { userId: user.id, mobileNumber: user.mobileNumber, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'OTP verified successfully', token });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
});

app.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { mobileNumber } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { mobileNumber } });
    if (!user) {
      res.status(400).json({ message: 'User not found. Please signup.' });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000); 
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); 
    await sendOtp(mobileNumber, otp); 
    await prisma.user.update({
      where: { mobileNumber },
      data: { otp: otp.toString(), otpExpiry }
    });

    res.status(200).json({ message: 'OTP sent successfully to your mobile number' });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
});

// Middleware to authorize using JWT token
app.get('/protected-resource', Authorize, (req: CustomRequest, res: Response) => {
  res.json({ message: `Welcome ${req.user?.mobileNumber}, you have access to this resource!` });
});

 
app.get('/users', authorize, async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json(users);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
});
 
app.get('/users/:id', authorize, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.status(200).json(user);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
});
 
app.post('/medicines', authorize, async (req: Request, res: Response): Promise<void> => {
  const { name, description, price, stock, vendorId } = req.body;
  try { 
    const user = await prisma.user.findUnique({ where: { id: vendorId } });
    if (!user || user.role !== 'vendor') {
      res.status(403).json({ message: 'Only vendors can add medicines' });
      return;
    }
 
    const store = await prisma.store.findUnique({
      where: { userId: vendorId },  
    });

    if (!store) {
      res.status(404).json({ message: 'Store not found for the vendor' });
      return;
    }
 
    const existingMedicine = await prisma.medicine.findFirst({
      where: {
        name: name,
        vendorId: vendorId,
      },
    });

    if (existingMedicine) { 
      const updatedMedicine = await prisma.medicine.update({
        where: {
          id: existingMedicine.id,
        },
        data: {
          stock: existingMedicine.stock + stock,
          price: price,
        },
      });
      res.status(200).json(updatedMedicine);
      return;
    }
 
    const newMedicine = await prisma.medicine.create({
      data: {
        name,
        description,
        price,
        stock, 
        storeId: store.id,  
        vendorId,            
      },
    });

    res.status(201).json(newMedicine);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
});


app.post('/medicines', authorize, async (req: Request, res: Response): Promise<void> => {
  const { name, description, price, stock, vendorId } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: vendorId } });
    if (!user || user.role !== 'vendor') {
      res.status(403).json({ message: 'Only vendors can add medicines' });
      return;
    }
    const existingMedicine = await prisma.medicine.findFirst({
      where: {
        name: name,
        vendorId: vendorId,
      },
    });

    if (existingMedicine) {
      const updatedMedicine = await prisma.medicine.update({
        where: {
          id: existingMedicine.id
        },
        data: {
          stock: existingMedicine.stock + stock,
          price: price 
        }
      });
       res.status(200).json(updatedMedicine);  
       return;
    }
    const newMedicine = await prisma.medicine.create({
      data: {
        name,
        description,
        price,
        stock,
        vendorId,
      },
    });

    res.status(201).json(newMedicine);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
});

app.get('/medicines', async (req: Request, res: Response): Promise<void> => {
  try {
    const medicines = await prisma.medicine.findMany();
    res.status(200).json(medicines);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
});
app.get('/medicines/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const medicine = await prisma.medicine.findUnique({ where: { id: parseInt(id) } });
    if (!medicine) {
      res.status(404).json({ message: 'Medicine not found' });
      return;
    }
    res.status(200).json(medicine);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
});
// Update a medicine (only for vendors)
app.put('/medicines/:id', authorize, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, description, price, stock, vendorId } = req.body;
  try {
    const medicine = await prisma.medicine.findUnique({ where: { id: parseInt(id) } });
    if (!medicine) {
       res.status(404).json({ message: 'Medicine not found' });
       return;
    }
    if (medicine.vendorId !== vendorId) {
      res.status(403).json({ message: 'You are not authorized to update this medicine' });
      return;
    }
    const updatedMedicine = await prisma.medicine.update({
      where: { id: parseInt(id) },
      data: { name, description, price, stock, vendorId },
    });
    res.status(200).json(updatedMedicine);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
});

// Delete a medicine (only for vendors)
app.delete('/medicines/:id', authorize, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const {vendorId} = req.body;
  try {
    const medicine = await prisma.medicine.findUnique({ where: { id: parseInt(id) } });
    if (!medicine) {
      res.status(404).json({ message: 'Medicine not found' });
      return;
    }
    if (medicine.vendorId !== vendorId) {
        res.status(403).json({ message: 'You are not authorized to update this medicine' });
        return;
    }
    const deletedMedicine = await prisma.medicine.delete({
      where: { id: parseInt(id) },
    });
    res.status(200).json(deletedMedicine);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
});

// Get medicines by vendor
app.get('/vendors/:vendorId/medicines', async (req: Request, res: Response): Promise<void> => {
  const { vendorId } = req.params;
  try {
    const medicines = await prisma.medicine.findMany({
      where: { vendorId: parseInt(vendorId) },
    });
    res.status(200).json(medicines);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
}); 

app.post('/stores', authorize, async (req: CustomRequest, res: Response): Promise<void> => {
  const { name, location } = req.body;
  const { userId, role } = req.user || {};
 
  if (!userId) {
     res.status(400).json({ message: 'User is not authenticated' });
     return;
  }
 
  if (role !== 'vendor') {
     res.status(403).json({ message: 'Only vendors are allowed to create stores' });
     return;
  }
 
  if (!name || !location) {
     res.status(400).json({ message: 'Store name and location are required' });
     return;
  }

  try { 
    const existingStore = await prisma.store.findFirst({
      where: { name, userId },
    });

    if (existingStore) {
       res.status(400).json({ message: 'Store with the same name already exists' });
       return;  
   }
 
    const newStore = await prisma.store.create({
      data: { 
        name,
        location,
        userId,
      },
    });

    res.status(201).json(newStore);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
});


// store by ID
app.get('/stores/:id', async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;  
    try {
      const store = await prisma.store.findUnique({
        where: { id: parseInt(id) },
        include: { medicines: true }, // Optionally include medicines in the store
      });
  
      if (!store) {
        res.status(404).json({ message: 'Store not found' });
        return;
      }
  
      res.status(200).json(store);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
});
//get all stores

app.get('/stores', async (req: Request, res: Response): Promise<void> => {
    try {
      const stores = await prisma.store.findMany();
      res.status(200).json(stores);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
});
//update store by id
app.put('/stores/:id', authorize, async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, location } = req.body;
    const userId = req.user?.id;
  
    if (!userId) {
      res.status(400).json({ message: 'User is not authenticated' });
      return;
    }
  
    try {
      const store = await prisma.store.findUnique({ where: { id: parseInt(id) } });
      if (!store) {
        res.status(404).json({ message: 'Store not found' });
        return;
      }
  
      if (store.userId !== userId) {
        res.status(403).json({ message: 'You are not authorized to update this store' });
        return;
      }
  
      const updatedStore = await prisma.store.update({
        where: { id: parseInt(id) },
        data: { name, location },
      });
  
      res.status(200).json(updatedStore);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
});
//delete store by id
app.delete('/stores/:id', authorize, async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;
  
    if (!userId) {
      res.status(400).json({ message: 'User is not authenticated' });
      return;
    }
  
    try {
      const store = await prisma.store.findUnique({ where: { id: parseInt(id) } });
      if (!store) {
        res.status(404).json({ message: 'Store not found' });
        return;
      }
  
      if (store.userId !== userId) {
        res.status(403).json({ message: 'You are not authorized to delete this store' });
        return;
      }
  
      await prisma.store.delete({ where: { id: parseInt(id) } });
  
      res.status(200).json({ message: 'Store deleted successfully' });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
});


// Reviews...

//create review
app.post('/reviews', authorize, async (req: Request, res: Response): Promise<void> => {
    const { content, rating, medicineId } = req.body;
    const userId = req.user?.userId;
    if (!userId) {
      res.status(400).json({ message: 'User is not authenticated' });
      return;
    }
  
    try {
      const newReview = await prisma.review.create({
        data: {
          content,
          rating,
          userId,
          medicineId,
        },
      });
  
      res.status(201).json(newReview);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
});
//get all reviews for a medicine

app.get('/medicines/:id/reviews', async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
  
    try {
      const reviews = await prisma.review.findMany({
        where: { medicineId: parseInt(id) },
        include: { user: true }, // Optionally include the user's details who posted the review
      });
  
      if (reviews.length === 0) {
        res.status(404).json({ message: 'No reviews found for this medicine' });
        return;
      }
  
      res.status(200).json(reviews);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
});
//allow users to delete their review
app.delete('/reviews/:id', authorize, async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;
  
    if (!userId) {
      res.status(400).json({ message: 'User is not authenticated' });
      return;
    }
  
    try {
      const review = await prisma.review.findUnique({ where: { id: parseInt(id) } });
      if (!review) {
        res.status(404).json({ message: 'Review not found' });
        return;
      }
  
      if (review.userId !== userId) {
        res.status(403).json({ message: 'You are not authorized to delete this review' });
        return;
      }
  
      await prisma.review.delete({ where: { id: parseInt(id) } });
  
      res.status(200).json({ message: 'Review deleted successfully' });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
});
  
  
  
  


  



// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

