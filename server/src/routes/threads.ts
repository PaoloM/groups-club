import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma.js';
import { requireMember } from '../middleware/auth.js';
import { uploadAttachments } from '../middleware/upload.js';
import { paramString } from '../types.js';

const router = Router({ mergeParams: true });

const attachmentSelect = { id: true, filename: true, path: true, mimeType: true, size: true };

const authorSelect = { id: true, name: true, avatarUrl: true, avatarAttachment: { select: { path: true } } };

function resolveAuthor(author: any) {
  const { avatarAttachment, ...rest } = author;
  return { ...rest, avatarUrl: avatarAttachment ? `/uploads/${avatarAttachment.path}` : author.avatarUrl || null };
}

function mapAttachments(attachments: any[]) {
  return attachments.map((a) => ({ ...a, url: `/uploads/${a.path}` }));
}

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
      const isSiteOwner = (req.user as any)?.isSiteOwner;
      if (!isSiteOwner) {
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
    }

    const threads = await prisma.thread.findMany({
      where: { groupId: group.id },
      include: {
        author: { select: authorSelect },
        _count: { select: { posts: true } },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const result = threads.map((t) => {
      const { _count, ...rest } = t;
      return { ...rest, author: resolveAuthor(t.author), postCount: _count.posts };
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
  (req: Request, res: Response, next: NextFunction) => {
    uploadAttachments(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = (req as any).group;
      const { title, body } = req.body;

      if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required.' });
      }

      const thread = await prisma.thread.create({
        data: {
          groupId: group.id,
          authorId: (req.user as any).id,
          title,
          body,
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
            threadId: thread.id,
          },
          select: attachmentSelect,
        });
        attachments.push({ ...att, url: `/uploads/${att.path}` });
      }

      res.status(201).json({ thread: { ...thread, attachments } });
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
      const isSiteOwner = (req.user as any)?.isSiteOwner;
      if (!isSiteOwner) {
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
    }

    const thread = await prisma.thread.findFirst({
      where: { id: threadId, groupId: group.id },
      include: {
        author: { select: authorSelect },
        attachments: { select: attachmentSelect },
        posts: {
          include: {
            author: { select: authorSelect },
            attachments: { select: attachmentSelect },
            _count: { select: { likes: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found.' });
    }

    // Determine which posts the current user has liked
    const userId = req.isAuthenticated() ? (req.user as any).id : null;
    const postIds = thread.posts.map((p) => p.id);
    const userLikes = userId
      ? await prisma.like.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } })
      : [];
    const likedPostIds = new Set(userLikes.map((l) => l.postId));

    // Map attachment URLs, authors, and like data
    const result = {
      ...thread,
      author: resolveAuthor(thread.author),
      attachments: mapAttachments(thread.attachments),
      posts: thread.posts.map((p) => {
        const { _count, ...rest } = p;
        return {
          ...rest,
          author: resolveAuthor(p.author),
          attachments: mapAttachments(p.attachments),
          likeCount: _count.likes,
          userLiked: likedPostIds.has(p.id),
        };
      }),
    };

    res.json({ thread: result });
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
    const isSiteOwner = (req.user as any).isSiteOwner;
    const isAdminOrOwner = isSiteOwner || (membership && membership.role === 'admin');
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
        author: { select: authorSelect },
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
    const isSiteOwner = (req.user as any).isSiteOwner;
    const isAdminOrOwner = isSiteOwner || (membership && membership.role === 'admin');
    if (!isAuthor && !isAdminOrOwner) {
      return res.status(403).json({ error: 'You can only delete your own threads.' });
    }

    // Delete attachment files from disk
    const attachments = await prisma.attachment.findMany({ where: { threadId: thread.id } });
    for (const att of attachments) {
      const filePath = path.join(__dirname, '../../uploads', att.path);
      fs.unlink(filePath, () => {});
    }
    // Also delete post attachment files
    const posts = await prisma.post.findMany({ where: { threadId: thread.id }, select: { id: true } });
    const postAttachments = await prisma.attachment.findMany({ where: { postId: { in: posts.map(p => p.id) } } });
    for (const att of postAttachments) {
      const filePath = path.join(__dirname, '../../uploads', att.path);
      fs.unlink(filePath, () => {});
    }

    await prisma.thread.delete({ where: { id: thread.id } });
    res.json({ message: 'Thread deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
