import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendOtp = async (mobileNumber: string, otp: number): Promise<void> => {
    try {
        await client.messages.create({
            body: `Your OTP code is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,  // Your Twilio number
            to: mobileNumber,
        });
    } catch (error) {
        console.error('Error sending OTP:', error);
        throw new Error('Failed to send OTP');
    }
};

// You can implement further OTP verification logic if needed
