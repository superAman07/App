import otpGenerator from 'otp-generator';
import { prisma } from '../db'; // Prisma Client import

// OTP Generation
export const generateOtp = (): string => {
  return otpGenerator.generate(6, { upperCase: false, specialChars: false, digits: true });
};

// Save OTP in the database with expiration time
export const saveOtpToDatabase = async (phoneNumber: string, otp: string) => {
  const expirationTime = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes
  await prisma.oTP.create({
    data: {
      otp,
      userId: 1, // You should replace 1 with the actual user ID
      expiresAt: new Date(expirationTime),
    },
  });
};

// Fetch OTP from the database
export const getOtpFromDatabase = async (phoneNumber: string): Promise<string | null> => {
    const user = await prisma.user.findUnique({
      where: { mobileNumber: phoneNumber },
    });
  
    if (!user) {
      return null; 
    }
    const otpRecord = await prisma.oTP.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }, 
    });
  
    if (otpRecord && otpRecord.expiresAt > new Date()) {
      return otpRecord.otp;
    }
  
    return null;  
  };
  
