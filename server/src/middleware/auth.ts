import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { paramString } from '../types.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
}

export function requireMember(roleLevel?: 'admin' | 'owner') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const slug = paramString(req.params.slug);
    if (!slug) {
      return res.status(400).json({ error: 'Group slug required.' });
    }

    try {
      const group = await prisma.group.findUnique({ where: { slug } });
      if (!group) {
        return res.status(404).json({ error: 'Group not found.' });
      }

      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: (req.user as any).id, groupId: group.id } },
      });

      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this group.' });
      }

      if (roleLevel === 'admin' && membership.role === 'member') {
        return res.status(403).json({ error: 'Admin or owner access required.' });
      }

      if (roleLevel === 'owner' && membership.role !== 'owner') {
        return res.status(403).json({ error: 'Owner access required.' });
      }

      (req as any).group = group;
      (req as any).membership = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
}
