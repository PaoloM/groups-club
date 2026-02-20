import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { paramString } from '../types.js';

const router = Router();

// GET /api/users/me
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = req.user as any;
  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// PATCH /api/users/me
router.patch('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, avatarUrl } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

    const user = await prisma.user.update({
      where: { id: (req.user as any).id },
      data,
    });

    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me/groups
router.get('/me/groups', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: (req.user as any).id },
      include: {
        group: {
          include: {
            _count: { select: { memberships: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const groups = memberships.map((m) => {
      const { _count, ...groupRest } = m.group;
      return { ...groupRest, memberCount: _count.memberships, role: m.role };
    });

    res.json({ groups });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = paramString(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        memberships: {
          include: {
            group: { select: { id: true, name: true, slug: true, imageUrl: true } },
          },
          where: { group: { isPublic: true } },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
