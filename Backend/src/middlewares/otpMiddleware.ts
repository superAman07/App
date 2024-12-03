import { body } from 'express-validator';

export const validateOtp = [
  body('phoneNumber')
    .isMobilePhone('any', { strictMode: false }) // Supports international formats
    .withMessage('Valid phone number is required'),
  body('otp')
    .isNumeric()
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits'),
];
