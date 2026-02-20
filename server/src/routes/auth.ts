import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import passport from '../middleware/passport.js';
import prisma from '../lib/prisma.js';
import { validate } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  validate([
    { field: 'name', required: true, type: 'string', minLength: 1, maxLength: 100 },
    { field: 'email', required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Valid email is required.' },
    { field: 'password', required: true, type: 'string', minLength: 8, message: 'Password must be at least 8 characters.' },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword },
      });

      // Log the user in after registration
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

// POST /api/auth/login
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials.' });
    }
    req.login(user, (err) => {
      if (err) return next(err);
      const { password: _, ...safeUser } = user;
      return res.json({ user: safeUser });
    });
  })(req, res, next);
});

// GET /api/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /api/auth/google/callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (_req: Request, res: Response) => {
    res.redirect('/dashboard');
  }
);

// POST /api/auth/logout
router.post('/logout', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('connect.sid');
      return res.json({ message: 'Logged out.' });
    });
  });
});

export default router;
