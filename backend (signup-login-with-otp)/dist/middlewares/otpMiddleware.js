"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOtp = void 0;
// src/middlewares/otpMiddleware.ts
const express_validator_1 = require("express-validator");
exports.validateOtp = [
    (0, express_validator_1.body)('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
    (0, express_validator_1.body)('otp').isNumeric().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];
