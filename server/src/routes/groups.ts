import { Router, Request, Response, NextFunction } from 'express';
import slugify from 'slugify';
import prisma from '../lib/prisma.js';
import { requireAuth, requireMember } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { paramString } from '../types.js';

const router = Router();

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name, { lower: true, strict: true });
  let slug = base;
  let counter = 1;
  while (await prisma.group.findUnique({ where: { slug } })) {
    slug = `${base}-${++counter}`;
  }
  return slug;
}

// GET /api/groups
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const where: any = { isPublic: true };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const groups = await prisma.group.findMany({
      where,
      include: { _count: { select: { memberships: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const result = groups.map((g) => {
      const { _count, ...rest } = g;
      return { ...rest, memberCount: _count.memberships };
    });

    res.json({ groups: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/groups
router.post(
  '/',
  requireAuth,
  validate([
    { field: 'name', required: true, type: 'string', minLength: 1, maxLength: 100 },
    { field: 'description', required: true, type: 'string', minLength: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, imageUrl, isPublic } = req.body;
      const userId = (req.user as any).id;
      const slug = await generateUniqueSlug(name);

      const group = await prisma.group.create({
        data: {
          name,
          slug,
          description,
          imageUrl: imageUrl || null,
          isPublic: isPublic !== undefined ? isPublic : true,
          createdById: userId,
        },
      });

      await prisma.membership.create({
        data: { userId, groupId: group.id, role: 'owner' },
      });

      res.status(201).json({ group });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/groups/:slug
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = paramString(req.params.slug);
    const group = await prisma.group.findUnique({
      where: { slug },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { memberships: true, threads: true } },
      },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    if (!group.isPublic) {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(403).json({ error: 'This group is private.' });
      }
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId, groupId: group.id } },
      });
      if (!membership) {
        return res.status(403).json({ error: 'This group is private.' });
      }
    }

    let currentUserMembership = null;
    if (req.isAuthenticated()) {
      currentUserMembership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: (req.user as any).id, groupId: group.id } },
      });
    }

    const { _count, ...rest } = group;
    res.json({
      group: {
        ...rest,
        memberCount: _count.memberships,
        threadCount: _count.threads,
        currentUserMembership: currentUserMembership
          ? { id: currentUserMembership.id, role: currentUserMembership.role, joinedAt: currentUserMembership.joinedAt }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/groups/:slug
router.patch(
  '/:slug',
  requireMember('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = paramString(req.params.slug);
      const { name, description, imageUrl, isPublic } = req.body;
      const data: any = {};
      if (name !== undefined) {
        data.name = name;
        data.slug = await generateUniqueSlug(name);
      }
      if (description !== undefined) data.description = description;
      if (imageUrl !== undefined) data.imageUrl = imageUrl;
      if (isPublic !== undefined) data.isPublic = isPublic;

      const group = await prisma.group.update({
        where: { slug },
        data,
      });

      res.json({ group });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/groups/:slug
router.delete(
  '/:slug',
  requireMember('owner'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = paramString(req.params.slug);
      await prisma.group.delete({ where: { slug } });
      res.json({ message: 'Group deleted.' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
