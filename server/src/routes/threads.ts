import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { requireMember } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { paramString } from '../types.js';

const router = Router({ mergeParams: true });

async function resolveGroup(slug: string) {
  return prisma.group.findUnique({ where: { slug } });
}

// GET /api/groups/:slug/threads
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = paramString(req.params.slug);
    const group = await resolveGroup(slug);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    if (!group.isPublic) {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ error: 'This group is private.' });
      }
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: (req.user as any).id, groupId: group.id } },
      });
      if (!membership) {
        return res.status(403).json({ error: 'This group is private.' });
      }
    }

    const threads = await prisma.thread.findMany({
      where: { groupId: group.id },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { posts: true } },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const result = threads.map((t) => {
      const { _count, ...rest } = t;
      return { ...rest, postCount: _count.posts };
    });

    res.json({ threads: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/groups/:slug/threads
router.post(
  '/',
  requireMember(),
  validate([
    { field: 'title', required: true, type: 'string', minLength: 1, maxLength: 200 },
    { field: 'body', required: true, type: 'string', minLength: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = (req as any).group;
      const { title, body } = req.body;

      const thread = await prisma.thread.create({
        data: {
          groupId: group.id,
          authorId: (req.user as any).id,
          title,
          body,
        },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      res.status(201).json({ thread });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/groups/:slug/threads/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = paramString(req.params.slug);
    const threadId = paramString(req.params.id);
    const group = await resolveGroup(slug);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    if (!group.isPublic) {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ error: 'This group is private.' });
      }
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: (req.user as any).id, groupId: group.id } },
      });
      if (!membership) {
        return res.status(403).json({ error: 'This group is private.' });
      }
    }

    const thread = await prisma.thread.findFirst({
      where: { id: threadId, groupId: group.id },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        posts: {
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found.' });
    }

    res.json({ thread });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/groups/:slug/threads/:id
router.patch('/:id', requireMember(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const threadId = paramString(req.params.id);
    const group = (req as any).group;
    const membership = (req as any).membership;
    const userId = (req.user as any).id;

    const thread = await prisma.thread.findFirst({
      where: { id: threadId, groupId: group.id },
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found.' });
    }

    const isAuthor = thread.authorId === userId;
    const isAdminOrOwner = membership.role === 'admin' || membership.role === 'owner';
    if (!isAuthor && !isAdminOrOwner) {
      return res.status(403).json({ error: 'You can only edit your own threads.' });
    }

    const data: any = {};
    if (req.body.title !== undefined) data.title = req.body.title;
    if (req.body.body !== undefined) data.body = req.body.body;
    if (req.body.isPinned !== undefined && isAdminOrOwner) {
      data.isPinned = req.body.isPinned;
    }

    const updated = await prisma.thread.update({
      where: { id: thread.id },
      data,
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    res.json({ thread: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/groups/:slug/threads/:id
router.delete('/:id', requireMember(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const threadId = paramString(req.params.id);
    const group = (req as any).group;
    const membership = (req as any).membership;
    const userId = (req.user as any).id;

    const thread = await prisma.thread.findFirst({
      where: { id: threadId, groupId: group.id },
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found.' });
    }

    const isAuthor = thread.authorId === userId;
    const isAdminOrOwner = membership.role === 'admin' || membership.role === 'owner';
    if (!isAuthor && !isAdminOrOwner) {
      return res.status(403).json({ error: 'You can only delete your own threads.' });
    }

    await prisma.thread.delete({ where: { id: thread.id } });
    res.json({ message: 'Thread deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
