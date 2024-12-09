import { Twilio } from "twilio";
import dotenv from "dotenv";
dotenv.config();

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
);

client.messages
  .create({
    body: "Test OTP message",
    from: process.env.TWILIO_PHONE_NUMBER,
    to: "+918922810977",  // Replace with a valid phone number
  })
  .then(message => console.log("Message sent:", message.sid))
  .catch(error => console.error("Error sending message:", error));
