import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';
import { validate } from '../middleware/validation.js';

const router = Router();

// GET /api/setup/status
router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const siteOwner = await prisma.user.findFirst({ where: { isSiteOwner: true } });
    res.json({ needsSetup: !siteOwner });
  } catch (err) {
    next(err);
  }
});

// POST /api/setup
router.post(
  '/',
  validate([
    { field: 'name', required: true, type: 'string', minLength: 1, maxLength: 100 },
    { field: 'email', required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Valid email is required.' },
    { field: 'password', required: true, type: 'string', minLength: 8, message: 'Password must be at least 8 characters.' },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.user.findFirst({ where: { isSiteOwner: true } });
      if (existing) {
        return res.status(409).json({ error: 'Site owner already exists.' });
      }

      const { name, email, password } = req.body;

      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword, isSiteOwner: true },
      });

      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...safeUser } = user;
        return res.status(201).json({ user: safeUser });
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
