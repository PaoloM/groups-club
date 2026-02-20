import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requireMember } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { paramString } from '../types.js';

const router = Router({ mergeParams: true });

// POST /api/groups/:slug/threads/:id/posts
router.post(
  '/',
  requireMember(),
  validate([{ field: 'body', required: true, type: 'string', minLength: 1 }]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = (req as any).group;
      const threadId = paramString(req.params.id);
      const { body, parentId } = req.body;

      const thread = await prisma.thread.findFirst({
        where: { id: threadId, groupId: group.id },
      });

      if (!thread) {
        return res.status(404).json({ error: 'Thread not found.' });
      }

      if (parentId) {
        const parent = await prisma.post.findFirst({
          where: { id: parentId, threadId: thread.id },
        });
        if (!parent) {
          return res.status(404).json({ error: 'Parent post not found.' });
        }
      }

      const post = await prisma.post.create({
        data: {
          threadId: thread.id,
          authorId: (req.user as any).id,
          body,
          parentId: parentId || null,
        },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      res.status(201).json({ post });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/posts/:id
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const postId = paramString(req.params.id);
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.authorId !== (req.user as any).id) {
      return res.status(403).json({ error: 'You can only edit your own posts.' });
    }

    const updated = await prisma.post.update({
      where: { id: post.id },
      data: { body: req.body.body },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    res.json({ post: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const postId = paramString(req.params.id);
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const userId = (req.user as any).id;
    const isAuthor = post.authorId === userId;

    // Check if user is admin/owner of the group
    const thread = await prisma.thread.findUnique({ where: { id: post.threadId } });
    let isAdminOrOwner = false;
    if (thread) {
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId, groupId: thread.groupId } },
      });
      if (membership && (membership.role === 'admin' || membership.role === 'owner')) {
        isAdminOrOwner = true;
      }
    }

    if (!isAuthor && !isAdminOrOwner) {
      return res.status(403).json({ error: 'You can only delete your own posts.' });
    }

    // Check if post has replies
    const replyCount = await prisma.post.count({ where: { parentId: post.id } });
    if (replyCount > 0) {
      await prisma.post.update({
        where: { id: post.id },
        data: { body: '[deleted]' },
      });
      return res.json({ message: 'Post content removed (has replies).' });
    }

    await prisma.post.delete({ where: { id: post.id } });
    res.json({ message: 'Post deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
