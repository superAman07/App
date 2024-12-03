import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CustomRequest } from '../customRequest.interface';  

export const authorize = (req: CustomRequest, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];  // Extract token

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; mobileNumber: string; role: string };

    req.user = decoded;  // Attach decoded data to request
    next();  // Proceed to the next middleware/route
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
