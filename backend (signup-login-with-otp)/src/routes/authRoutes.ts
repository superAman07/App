import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { Twilio } from "twilio";

const router = express.Router();
const prisma = new PrismaClient();
const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
);
const generateOtp = () => ({
  otp: Math.floor(100000 + Math.random() * 900000),
  otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
});

router.post("/signup", async (req: Request, res: Response): Promise<void> => {
  const { name, mobileNumber, role } = req.body;
  if (!/^\+\d{10,15}$/.test(mobileNumber)) {
    res.status(400).json({ error: "Invalid mobile number format" });
    return;
  }  
 
  const validRoles = ["user", "vendor"];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
 
  const existingUser = await prisma.user.findUnique({
    where: { mobileNumber },
  });

  if (existingUser) {
    res.status(400).json({ error: "User already exists" });
    return;
  }
  try {   

    const {otp, otpExpiry} = generateOtp(); 

    const recentOtp = await prisma.otp.findFirst({
      where: { mobileNumber },
      orderBy: { createdAt: "desc" },
    });
    
    if (recentOtp && new Date(recentOtp.expiresAt).getTime() > Date.now()) {
      const waitTime = Math.ceil((new Date(recentOtp.expiresAt).getTime() - Date.now()) / 1000);
      res.status(400).json({ error: `OTP already sent. Please wait ${waitTime} seconds.` });
      return;
    }
     
    await prisma.otp.deleteMany({ where: { mobileNumber } });
    await prisma.otp.create({
      data: {
        mobileNumber,
        otp,
        expiresAt: otpExpiry,
      }
    });  
    await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobileNumber,
    });

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ error: "Error sending OTP", details: error instanceof Error ? error.message : undefined });
  }
});
  
 
router.post("/verifyOtpSignup", async (req: Request, res: Response): Promise<void> => {
    const { name, mobileNumber, role, otp } = req.body; 

    const otpRecord = await prisma.otp.findFirst({
      where: { mobileNumber, otp },
      orderBy: { createdAt: "desc" },
    }); 
  
    if(!otpRecord ||new Date(otpRecord.expiresAt).getTime() < Date.now()) {
        res.status(400).json({ error: "OTP expired or invalid" });
        return;
    }
      
    try { 
      const newUser = await prisma.user.create({
        data: { name, mobileNumber, role },
      }); 
      await prisma.otp.delete({ where: { id: otpRecord.id } });
      
      const token = jwt.sign(
        { userId: newUser.id, role: newUser.role },
        process.env.JWT_SECRET as string,
        { expiresIn: "1h" }
      ); 
  
      res.status(201).json({ message: "User created successfully", token });
    } catch (error) { 
      res.status(500).json({ error: "Error creating user" });
    }
});
  
   
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { mobileNumber } = req.body;
 
  if (!/^\+\d{10,15}$/.test(mobileNumber)) {
    res.status(400).json({ error: "Invalid mobile number format" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { mobileNumber },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const recentOtp = await prisma.otp.findFirst({
    where: { mobileNumber },
    orderBy: { createdAt: "desc" },
  });

  if (recentOtp && new Date(recentOtp.expiresAt).getTime() > Date.now()) {
    const waitTime = Math.ceil((new Date(recentOtp.expiresAt).getTime() - Date.now()) / 1000);
    res.status(400).json({ error: `OTP already sent. Please wait ${waitTime} seconds.` });
    return;
  }

  const { otp, otpExpiry } = generateOtp();

  try { 
    if (recentOtp) {
      await prisma.otp.delete({ where: { id: recentOtp.id } });
    }
 
    await prisma.otp.create({
      data: {
        mobileNumber,
        otp,
        expiresAt: otpExpiry,
        user: { connect: { id: user.id } },
      },
    });
    await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobileNumber,
    });

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ error: "Error sending OTP", details: error instanceof Error ? error.message : undefined });
  }
});
   
router.post("/verifyOtpLogin", async (req: Request, res: Response): Promise<void> => {
  const { mobileNumber, otp } = req.body;
 
  if (!/^\+\d{10,15}$/.test(mobileNumber)) {
    res.status(400).json({ error: "Invalid mobile number format" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { mobileNumber },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const otpRecord = await prisma.otp.findFirst({
    where: { mobileNumber, otp },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord || otpRecord.expiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: "OTP expired or invalid" });
    return;
  }

  try { 
    await prisma.otp.delete({ where: { id: otpRecord.id } });
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}); 

export default router;