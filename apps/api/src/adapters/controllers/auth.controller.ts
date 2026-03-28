import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../../infrastructure/database';
import { config } from '../../infrastructure/config';
import { authMiddleware, AuthRequest } from '../../infrastructure/middleware/auth';
import { authLimiter } from '../../infrastructure/middleware/rateLimiter';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  preferredLang: z.string().default('en'),
  tripPurpose: z.enum(['business', 'leisure']).default('leisure'),
  dietaryPref: z.string().optional(),
  seatPreference: z.string().optional(),
  passportCountry: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', authLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      res.status(409).json({ error: 'Email already exists', code: 'DUPLICATE_EMAIL' });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
        preferredLang: parsed.data.preferredLang,
        tripPurpose: parsed.data.tripPurpose,
        dietaryPref: parsed.data.dietaryPref || null,
        seatPreference: parsed.data.seatPreference || null,
        passportCountry: parsed.data.passportCountry || null,
      },
    });

    const accessToken = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, preferredLang: user.preferredLang, tripPurpose: user.tripPurpose },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

router.post('/login', authLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      return;
    }

    const validPassword = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      return;
    }

    const accessToken = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    res.json({
      user: { id: user.id, email: user.email, name: user.name, preferredLang: user.preferredLang, tripPurpose: user.tripPurpose },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

router.post('/refresh', async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required', code: 'MISSING_TOKEN' });
      return;
    }

    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as { userId: string };
    const newAccessToken = jwt.sign({ userId: decoded.userId }, config.JWT_SECRET, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ userId: decoded.userId }, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(403).json({ error: 'Invalid refresh token', code: 'INVALID_TOKEN' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({
      user: { id: user.id, email: user.email, name: user.name, preferredLang: user.preferredLang, tripPurpose: user.tripPurpose, dietaryPref: user.dietaryPref, seatPreference: user.seatPreference },
    });
  } catch {
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const updateSchema = z.object({
      name: z.string().min(2).optional(),
      preferredLang: z.string().optional(),
      tripPurpose: z.enum(['business', 'leisure']).optional(),
      dietaryPref: z.string().optional(),
      seatPreference: z.string().optional(),
    });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: parsed.data,
    });

    res.json({
      user: { id: user.id, email: user.email, name: user.name, preferredLang: user.preferredLang, tripPurpose: user.tripPurpose, dietaryPref: user.dietaryPref, seatPreference: user.seatPreference },
    });
  } catch {
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

export default router;
