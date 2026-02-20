import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requireMember } from '../middleware/auth.js';
import { paramString } from '../types.js';

const router = Router({ mergeParams: true });

// POST /api/groups/:slug/join
router.post('/join', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = paramString(req.params.slug);
    const group = await prisma.group.findUnique({ where: { slug } });
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    if (!group.isPublic) {
      return res.status(403).json({ error: 'This group is private. You need an invite to join.' });
    }

    const userId = (req.user as any).id;
    const existing = await prisma.membership.findUnique({
      where: { userId_groupId: { userId, groupId: group.id } },
    });

    if (existing) {
      return res.status(409).json({ error: 'You are already a member of this group.' });
    }

    const membership = await prisma.membership.create({
      data: { userId, groupId: group.id, role: 'member' },
    });

    res.status(201).json({ membership });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/groups/:slug/leave
router.delete('/leave', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = paramString(req.params.slug);
    const group = await prisma.group.findUnique({ where: { slug } });
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const userId = (req.user as any).id;
    const membership = await prisma.membership.findUnique({
      where: { userId_groupId: { userId, groupId: group.id } },
    });

    if (!membership) {
      return res.status(404).json({ error: 'You are not a member of this group.' });
    }

    await prisma.membership.delete({ where: { id: membership.id } });

    const remaining = await prisma.membership.count({ where: { groupId: group.id } });
    if (remaining === 0) {
      await prisma.group.delete({ where: { id: group.id } });
      return res.json({ message: 'Left group. Group deleted (no members remaining).' });
    }

    res.json({ message: 'Left group.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/groups/:slug/members
router.get('/members', requireMember(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const group = (req as any).group;
    const members = await prisma.membership.findMany({
      where: { groupId: group.id },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' },
      ],
    });

    res.json({ members });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/groups/:slug/members/:id
router.patch('/members/:id', requireMember('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = paramString(req.params.id);
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "admin" or "member".' });
    }

    const target = await prisma.membership.findUnique({ where: { id: targetId } });
    if (!target) {
      return res.status(404).json({ error: 'Membership not found.' });
    }

    if (target.groupId !== (req as any).group.id) {
      return res.status(404).json({ error: 'Membership not found in this group.' });
    }

    const isSiteOwner = (req.user as any).isSiteOwner;

    // Only site owner can promote to admin or demote admins
    if (role === 'admin' && !isSiteOwner) {
      return res.status(403).json({ error: 'Only the site owner can promote to admin.' });
    }

    if (target.role === 'admin' && !isSiteOwner) {
      return res.status(403).json({ error: 'Only the site owner can change admin roles.' });
    }

    const updated = await prisma.membership.update({
      where: { id: target.id },
      data: { role },
    });

    res.json({ membership: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/groups/:slug/members/:id
router.delete('/members/:id', requireMember('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = paramString(req.params.id);
    const target = await prisma.membership.findUnique({ where: { id: targetId } });
    if (!target) {
      return res.status(404).json({ error: 'Membership not found.' });
    }

    if (target.groupId !== (req as any).group.id) {
      return res.status(404).json({ error: 'Membership not found in this group.' });
    }

    const isSiteOwner = (req.user as any).isSiteOwner;

    // Only site owner can remove admins
    if (target.role === 'admin' && !isSiteOwner) {
      return res.status(403).json({ error: 'Only the site owner can remove admins.' });
    }

    await prisma.membership.delete({ where: { id: target.id } });
    res.json({ message: 'Member removed.' });
  } catch (err) {
    next(err);
  }
});

export default router;
