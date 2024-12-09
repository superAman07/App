import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID as string, process.env.TWILIO_AUTH_TOKEN as string);

export const sendOtp = async (mobileNumber: string, otp: string): Promise<void> => {
    try { 
        await client.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER as string,
            to: mobileNumber,
        });
        console.log(`OTP ${otp} sent to ${mobileNumber}`);
    } catch (error) {
        console.error('Error sending OTP:', error);
        throw new Error('Failed to send OTP');
    }
};


export const validateOtp = (inputOtp: string, actualOtp: string, expiry: Date): boolean => {
    const isExpired = new Date() > expiry;
    return !isExpired && inputOtp === actualOtp;
};

