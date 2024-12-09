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
exports.verify = exports.signup = void 0;
const prismaClient_1 = __importDefault(require("../prisma/prismaClient"));
const otpHelper_1 = require("../utils/otpHelper");
const jwtHelper_1 = require("../utils/jwtHelper");
const signup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, mobileNumber, role } = req.body;
    try {
        const existingUser = yield prismaClient_1.default.user.findUnique({
            where: { mobileNumber },
        });
        if (existingUser) {
            res.status(400).json({ message: "User already exists." });
            return;
        }
        const otp = (0, otpHelper_1.generateOTP)();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        yield prismaClient_1.default.user.create({
            data: {
                name,
                mobileNumber,
                role,
                otp,
                otpExpiry,
            },
        });
        res.status(201).json({ message: "User created. Verify OTP.", otp });
    }
    catch (error) {
        res.status(500).json({ message: "Signup failed.", error });
    }
});
exports.signup = signup;
const verify = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { mobileNumber, otp } = req.body;
    try {
        const user = yield prismaClient_1.default.user.findUnique({
            where: { mobileNumber },
        });
        if (!user) {
            res.status(404).json({ message: "User not found." });
            return;
        }
        if (user.otp !== otp) {
            res.status(400).json({ message: "Invalid OTP." });
            return;
        }
        if (!user.otpExpiry || new Date() > user.otpExpiry) {
            res.status(400).json({ message: "OTP has expired." });
            return;
        }
        const token = (0, jwtHelper_1.generateToken)(user.id, user.role);
        res.status(200).json({ message: "Login successful.", token });
    }
    catch (error) {
        res.status(500).json({ message: "Verification failed.", error });
    }
});
exports.verify = verify;
