"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const twilio_1 = require("twilio");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const client = new twilio_1.Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
client.messages
    .create({
    body: "Test OTP message",
    from: process.env.TWILIO_PHONE_NUMBER,
    to: "+918922810977", // Replace with a valid phone number
})
    .then(message => console.log("Message sent:", message.sid))
    .catch(error => console.error("Error sending message:", error));
