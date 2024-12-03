// src/services/smsService.ts
import twilio from 'twilio';

const client = twilio('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN');  
export const sendOtpViaSms = async (phoneNumber: string, otp: string) => {
  const message = await client.messages.create({
    body: `Your OTP is ${otp}`,
    from: 'YOUR_TWILIO_PHONE_NUMBER',   
    to: phoneNumber
  });
  return message;
}
