import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma.js';
import { requireAuth, requireMember } from '../middleware/auth.js';
import { uploadAttachments } from '../middleware/upload.js';
import { paramString } from '../types.js';

const router = Router({ mergeParams: true });

const attachmentSelect = { id: true, filename: true, path: true, mimeType: true, size: true };

const authorSelect = { id: true, name: true, avatarUrl: true, avatarAttachment: { select: { path: true } } };

function resolveAuthor(author: any) {
  const { avatarAttachment, ...rest } = author;
  return { ...rest, avatarUrl: avatarAttachment ? `/uploads/${avatarAttachment.path}` : author.avatarUrl || null };
}

// POST /api/groups/:slug/threads/:id/posts
router.post(
  '/',
  requireMember(),
  (req: Request, res: Response, next: NextFunction) => {
    uploadAttachments(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = (req as any).group;
      const threadId = paramString(req.params.id);
      const { body, parentId } = req.body;

      if (!body) {
        return res.status(400).json({ error: 'body is required.' });
      }

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
          author: { select: authorSelect },
        },
      });

      // Save attachments
      const files = (req.files as Express.Multer.File[]) || [];
      const attachments = [];
      for (const file of files) {
        const att = await prisma.attachment.create({
          data: {
            filename: file.originalname,
            storedName: file.filename,
            mimeType: file.mimetype,
            size: file.size,
            path: `attachments/${file.filename}`,
            uploadedById: (req.user as any).id,
            postId: post.id,
          },
          select: attachmentSelect,
        });
        attachments.push({ ...att, url: `/uploads/${att.path}` });
      }

      res.status(201).json({ post: { ...post, author: resolveAuthor(post.author), attachments } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/posts/:id/like
router.post('/:id/like', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const postId = paramString(req.params.id);
    const userId = (req.user as any).id;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
    } else {
      await prisma.like.create({ data: { userId, postId } });
    }

    const likeCount = await prisma.like.count({ where: { postId } });
    res.json({ liked: !existing, likeCount });
  } catch (err) {
    next(err);
  }
});

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
        author: { select: authorSelect },
      },
    });

    res.json({ post: { ...updated, author: resolveAuthor(updated.author) } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const postId = paramString(req.params.id);
    const post = await prisma.post.findUnique({ where: { id: postId } });

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const userId = (req.user as any).id;
    const isAuthor = post.authorId === userId;
    const isSiteOwner = (req.user as any).isSiteOwner;

    let isAdminOrOwner = isSiteOwner;
    if (!isAdminOrOwner) {
      const thread = await prisma.thread.findUnique({ where: { id: post.threadId } });
      if (thread) {
        const membership = await prisma.membership.findUnique({
          where: { userId_groupId: { userId, groupId: thread.groupId } },
        });
        if (membership && membership.role === 'admin') {
          isAdminOrOwner = true;
        }
      }
    }

    if (!isAuthor && !isAdminOrOwner) {
      return res.status(403).json({ error: 'You can only delete your own posts.' });
    }

    const replyCount = await prisma.post.count({ where: { parentId: post.id } });
    if (replyCount > 0) {
      await prisma.post.update({
        where: { id: post.id },
        data: { body: '[deleted]' },
      });
      return res.json({ message: 'Post content removed (has replies).' });
    }

    // Delete attachment files from disk
    const attachments = await prisma.attachment.findMany({ where: { postId: post.id } });
    for (const att of attachments) {
      const filePath = path.join(__dirname, '../../uploads', att.path);
      fs.unlink(filePath, () => {});
    }

    await prisma.post.delete({ where: { id: post.id } });
    res.json({ message: 'Post deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
