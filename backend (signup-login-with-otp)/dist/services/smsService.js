"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpViaSms = void 0;
// src/services/smsService.ts
const twilio_1 = __importDefault(require("twilio"));
const client = (0, twilio_1.default)('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'); // Replace with your Twilio credentials
// Send OTP via SMS
const sendOtpViaSms = (phoneNumber, otp) => __awaiter(void 0, void 0, void 0, function* () {
    const message = yield client.messages.create({
        body: `Your OTP is ${otp}`,
        from: 'YOUR_TWILIO_PHONE_NUMBER', // Replace with your Twilio phone number
        to: phoneNumber
    });
    return message;
});
exports.sendOtpViaSms = sendOtpViaSms;
