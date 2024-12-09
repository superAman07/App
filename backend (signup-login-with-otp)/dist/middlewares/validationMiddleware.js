"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleValidationErrors = exports.validateUser = void 0;
const express_validator_1 = require("express-validator");
// Define validateUser as ValidationChain[]
exports.validateUser = [
    (0, express_validator_1.body)('name').isString().notEmpty().withMessage('Name is required and must be a string'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    (0, express_validator_1.body)('role').isIn(['user', 'vendor']).withMessage('Role must be either "user" or "vendor"'),
];
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
