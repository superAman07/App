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
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const twilio_1 = require("twilio");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const client = new twilio_1.Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const generateOtp = () => ({
    otp: Math.floor(100000 + Math.random() * 900000),
    otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
});
router.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    const existingUser = yield prisma.user.findUnique({
        where: { mobileNumber },
    });
    if (existingUser) {
        res.status(400).json({ error: "User already exists" });
        return;
    }
    try {
        const { otp, otpExpiry } = generateOtp();
        const recentOtp = yield prisma.otp.findFirst({
            where: { mobileNumber },
            orderBy: { createdAt: "desc" },
        });
        if (recentOtp && new Date(recentOtp.expiresAt).getTime() > Date.now()) {
            const waitTime = Math.ceil((new Date(recentOtp.expiresAt).getTime() - Date.now()) / 1000);
            res.status(400).json({ error: `OTP already sent. Please wait ${waitTime} seconds.` });
            return;
        }
        yield prisma.otp.deleteMany({ where: { mobileNumber } });
        yield prisma.otp.create({
            data: {
                mobileNumber,
                otp,
                expiresAt: otpExpiry,
            }
        });
        yield client.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: mobileNumber,
        });
        res.status(200).json({ message: "OTP sent successfully" });
    }
    catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ error: "Error sending OTP", details: error instanceof Error ? error.message : undefined });
    }
}));
router.post("/verifyOtpSignup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, mobileNumber, role, otp } = req.body;
    const otpRecord = yield prisma.otp.findFirst({
        where: { mobileNumber, otp },
        orderBy: { createdAt: "desc" },
    });
    if (!otpRecord || new Date(otpRecord.expiresAt).getTime() < Date.now()) {
        res.status(400).json({ error: "OTP expired or invalid" });
        return;
    }
    try {
        const newUser = yield prisma.user.create({
            data: { name, mobileNumber, role },
        });
        yield prisma.otp.delete({ where: { id: otpRecord.id } });
        const token = jsonwebtoken_1.default.sign({ userId: newUser.id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.status(201).json({ message: "User created successfully", token });
    }
    catch (error) {
        res.status(500).json({ error: "Error creating user" });
    }
}));
router.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { mobileNumber } = req.body;
    // Validate the mobile number format
    if (!/^\+\d{10,15}$/.test(mobileNumber)) {
        res.status(400).json({ error: "Invalid mobile number format" });
        return;
    }
    const user = yield prisma.user.findUnique({
        where: { mobileNumber },
    });
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    const recentOtp = yield prisma.otp.findFirst({
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
        // Delete any previous OTP
        if (recentOtp) {
            yield prisma.otp.delete({ where: { id: recentOtp.id } });
        }
        // Create the new OTP in the database
        yield prisma.otp.create({
            data: {
                mobileNumber,
                otp,
                expiresAt: otpExpiry,
                user: { connect: { id: user.id } },
            },
        });
        // Send OTP to the user
        yield client.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: mobileNumber,
        });
        res.status(200).json({ message: "OTP sent successfully" });
    }
    catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ error: "Error sending OTP", details: error instanceof Error ? error.message : undefined });
    }
}));
router.post("/verifyOtpLogin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { mobileNumber, otp } = req.body;
    // Validate the mobile number format
    if (!/^\+\d{10,15}$/.test(mobileNumber)) {
        res.status(400).json({ error: "Invalid mobile number format" });
        return;
    }
    const user = yield prisma.user.findUnique({
        where: { mobileNumber },
    });
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    // Retrieve OTP record from the database
    const otpRecord = yield prisma.otp.findFirst({
        where: { mobileNumber, otp },
        orderBy: { createdAt: "desc" },
    });
    if (!otpRecord || otpRecord.expiresAt.getTime() < Date.now()) {
        res.status(400).json({ error: "OTP expired or invalid" });
        return;
    }
    try {
        // Delete the OTP record after successful verification
        yield prisma.otp.delete({ where: { id: otpRecord.id } });
        // Generate JWT token for the user
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.status(200).json({ message: "Login successful", token });
    }
    catch (error) {
        console.error("Error during OTP verification:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
exports.default = router;
