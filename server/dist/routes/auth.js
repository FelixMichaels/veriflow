"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
// Login schema
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    name: zod_1.z.string().optional(),
});
// Development login endpoint
router.post('/login', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, name } = LoginSchema.parse(req.body);
    const jwtSecret = process.env.JWT_SECRET || 'development-secret';
    // Mock user for development
    const user = {
        id: '1',
        email,
        name: name || email.split('@')[0],
        role: 'admin',
    };
    // Generate JWT token
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, jwtSecret, { expiresIn: '24h' });
    res.json({
        success: true,
        data: {
            token,
            user,
        },
    });
}));
// Get current user
router.get('/me', (req, res) => {
    res.json({
        success: true,
        data: {
            user: {
                id: '1',
                email: 'test@example.com',
                name: 'Test User',
                role: 'admin',
            },
        },
    });
});
exports.default = router;
