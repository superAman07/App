// src/controllers/authController.ts
import { Request, Response } from 'express';
import { sendOtp } from '../services/otpService';    // Import OTP generation and sending logic
import { verifyOtp } from '../services/otpService';  // Import OTP verification logic

// Signup route
export const signup = async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;
  
  // Send OTP to the user's phone number
  const otp = await sendOtp(phoneNumber);

  res.status(200).json({ message: 'OTP sent successfully!' });
}

// Login route
export const login = async (req: Request, res: Response) => {
  const { phoneNumber, otp } = req.body;
  
  try {
    // Verify OTP entered by the user
    await verifyOtp(phoneNumber, otp);
    res.status(200).json({ message: 'Login successful!' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
