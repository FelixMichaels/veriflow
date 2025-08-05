import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Login schema
const LoginSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

// Development login endpoint
router.post('/login', asyncHandler(async (req, res) => {
  const { email, name } = LoginSchema.parse(req.body);

  const jwtSecret = process.env.JWT_SECRET || 'development-secret';

  // Mock user for development
  const user = {
    id: '1',
    email,
    name: name || email.split('@')[0],
    role: 'admin' as const,
  };

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id },
    jwtSecret,
    { expiresIn: '24h' }
  );

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

export default router;