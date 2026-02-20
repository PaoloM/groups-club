import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { paramString } from '../types.js';

const router = Router();

function resolveAvatarUrl(user: any): string | null {
  if (user.avatarAttachment) return `/uploads/${user.avatarAttachment.path}`;
  return user.avatarUrl || null;
}

// GET /api/users/me
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req.user as any).id },
      include: { avatarAttachment: { select: { path: true } } },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { password: _, avatarAttachment, ...safeUser } = user;
    res.json({ user: { ...safeUser, avatarUrl: resolveAvatarUrl(user) } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me
router.patch('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, avatarUrl } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (avatarUrl !== undefined) {
      data.avatarUrl = avatarUrl;
      data.avatarAttachmentId = null; // clear uploaded avatar when setting URL
    }

    const user = await prisma.user.update({
      where: { id: (req.user as any).id },
      data,
      include: { avatarAttachment: { select: { path: true } } },
    });

    const { password: _, avatarAttachment, ...safeUser } = user;
    res.json({ user: { ...safeUser, avatarUrl: resolveAvatarUrl(user) } });
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
            coverAttachment: { select: { path: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const groups = memberships.map((m) => {
      const { _count, coverAttachment, ...groupRest } = m.group;
      const imageUrl = coverAttachment ? `/uploads/${coverAttachment.path}` : groupRest.imageUrl;
      return { ...groupRest, imageUrl, memberCount: _count.memberships, role: m.role };
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
        avatarAttachment: { select: { path: true } },
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

    const { avatarAttachment, ...rest } = user;
    res.json({ user: { ...rest, avatarUrl: resolveAvatarUrl(user) } });
  } catch (err) {
    next(err);
  }
});

export default router;
