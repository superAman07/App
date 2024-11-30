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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const validationMiddleware_1 = require("./validationMiddleware");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const port = process.env.PORT || 3000;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '../.env' });
app.use(express_1.default.json());
const authorize = (req, res, next) => {
    var _a;
    const token = (_a = req.headers['authorization']) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    console.log("Received Token:", token);
    if (!token) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        console.log("Decoded Token:", decoded);
        req.user = decoded;
        console.log("User from decoded token:", req.user);
        next();
    });
};
// User Registration
app.post('/signup', [...validationMiddleware_1.validateUser, validationMiddleware_1.handleValidationErrors], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password, role } = req.body;
    try {
        const existingUser = yield prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: "User already exists. Please login." });
            return;
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const newUser = yield prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
            },
        });
        res.status(201).json(newUser);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
// User Login
app.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield prisma.user.findUnique({ where: { email } });
        console.log(user);
        if (!user) {
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }
        const isPasswordValid = yield bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: "Login successful", token });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
// Get all users
app.get('/users', authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma.user.findMany();
        res.status(200).json(users);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
// Get a specific user by ID
app.get('/users/:id', authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const user = yield prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.status(200).json(user);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
// Add a medicine (only for vendors)
app.post('/medicines', authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description, price, stock, vendorId } = req.body;
    try {
        // Only allow vendors to add medicines
        const user = yield prisma.user.findUnique({ where: { id: vendorId } });
        if (!user || user.role !== 'vendor') {
            res.status(403).json({ message: 'Only vendors can add medicines' });
            return;
        }
        const newMedicine = yield prisma.medicine.create({
            data: {
                name,
                description,
                price,
                stock,
                vendorId,
            },
        });
        res.status(201).json(newMedicine);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
// Get all medicines
app.get('/medicines', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const medicines = yield prisma.medicine.findMany();
        res.status(200).json(medicines);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
// Get a specific medicine by ID
app.get('/medicines/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const medicine = yield prisma.medicine.findUnique({ where: { id: parseInt(id) } });
        if (!medicine) {
            res.status(404).json({ message: 'Medicine not found' });
            return;
        }
        res.status(200).json(medicine);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
// Update a medicine (only for vendors)
app.put('/medicines/:id', authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, description, price, stock, vendorId } = req.body;
    try {
        const medicine = yield prisma.medicine.findUnique({ where: { id: parseInt(id) } });
        if (!medicine) {
            res.status(404).json({ message: 'Medicine not found' });
            return;
        }
        if (medicine.vendorId !== vendorId) {
            res.status(403).json({ message: 'You are not authorized to update this medicine' });
            return;
        }
        const updatedMedicine = yield prisma.medicine.update({
            where: { id: parseInt(id) },
            data: { name, description, price, stock, vendorId },
        });
        res.status(200).json(updatedMedicine);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
// Delete a medicine (only for vendors)
app.delete('/medicines/:id', authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const medicine = yield prisma.medicine.findUnique({ where: { id: parseInt(id) } });
        if (!medicine) {
            res.status(404).json({ message: 'Medicine not found' });
            return;
        }
        const deletedMedicine = yield prisma.medicine.delete({
            where: { id: parseInt(id) },
        });
        res.status(200).json(deletedMedicine);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
// Get medicines by vendor
app.get('/vendors/:vendorId/medicines', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { vendorId } = req.params;
    try {
        const medicines = yield prisma.medicine.findMany({
            where: { vendorId: parseInt(vendorId) },
        });
        res.status(200).json(medicines);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
app.post('/stores', authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, location } = req.body;
    const { userId, role } = req.user || {};
    console.log("User ID: ", userId);
    console.log("User Role: ", role);
    if (!userId) {
        res.status(400).json({ message: 'User is not authenticated' });
        return;
    }
    if (role !== 'vendor') {
        res.status(403).json({ message: 'Only vendors are allowed to create stores' });
        return;
    }
    try {
        const newStore = yield prisma.store.create({
            data: {
                name,
                location,
                userId,
            },
        });
        res.status(201).json(newStore);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
// store by ID
app.get('/stores/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const store = yield prisma.store.findUnique({
            where: { id: parseInt(id) },
            include: { medicines: true }, // Optionally include medicines in the store
        });
        if (!store) {
            res.status(404).json({ message: 'Store not found' });
            return;
        }
        res.status(200).json(store);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
//get all stores
app.get('/stores', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stores = yield prisma.store.findMany();
        res.status(200).json(stores);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
//update store by id
app.put('/stores/:id', authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const { name, location } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        res.status(400).json({ message: 'User is not authenticated' });
        return;
    }
    try {
        const store = yield prisma.store.findUnique({ where: { id: parseInt(id) } });
        if (!store) {
            res.status(404).json({ message: 'Store not found' });
            return;
        }
        if (store.userId !== userId) {
            res.status(403).json({ message: 'You are not authorized to update this store' });
            return;
        }
        const updatedStore = yield prisma.store.update({
            where: { id: parseInt(id) },
            data: { name, location },
        });
        res.status(200).json(updatedStore);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
//delete store by id
app.delete('/stores/:id', authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        res.status(400).json({ message: 'User is not authenticated' });
        return;
    }
    try {
        const store = yield prisma.store.findUnique({ where: { id: parseInt(id) } });
        if (!store) {
            res.status(404).json({ message: 'Store not found' });
            return;
        }
        if (store.userId !== userId) {
            res.status(403).json({ message: 'You are not authorized to delete this store' });
            return;
        }
        yield prisma.store.delete({ where: { id: parseInt(id) } });
        res.status(200).json({ message: 'Store deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
// Reviews...
//create review
app.post('/reviews', authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { content, rating, medicineId } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        res.status(400).json({ message: 'User is not authenticated' });
        return;
    }
    try {
        const newReview = yield prisma.review.create({
            data: {
                content,
                rating,
                userId,
                medicineId,
            },
        });
        res.status(201).json(newReview);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
//get all reviews for a medicine
app.get('/medicines/:id/reviews', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const reviews = yield prisma.review.findMany({
            where: { medicineId: parseInt(id) },
            include: { user: true }, // Optionally include the user's details who posted the review
        });
        if (reviews.length === 0) {
            res.status(404).json({ message: 'No reviews found for this medicine' });
            return;
        }
        res.status(200).json(reviews);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
//allow users to delete their review
app.delete('/reviews/:id', authorize, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        res.status(400).json({ message: 'User is not authenticated' });
        return;
    }
    try {
        const review = yield prisma.review.findUnique({ where: { id: parseInt(id) } });
        if (!review) {
            res.status(404).json({ message: 'Review not found' });
            return;
        }
        if (review.userId !== userId) {
            res.status(403).json({ message: 'You are not authorized to delete this review' });
            return;
        }
        yield prisma.review.delete({ where: { id: parseInt(id) } });
        res.status(200).json({ message: 'Review deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
}));
// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
