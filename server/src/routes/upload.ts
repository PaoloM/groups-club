import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma.js';
import { requireAuth, requireMember } from '../middleware/auth.js';
import { uploadAvatar, uploadCover } from '../middleware/upload.js';
import { paramString } from '../types.js';

const router = Router();

// POST /api/upload/avatar
router.post('/avatar', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  uploadAvatar(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
      const userId = (req.user as any).id;
      const file = req.file;

      const attachment = await prisma.attachment.create({
        data: {
          filename: file.originalname,
          storedName: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          path: `avatars/${file.filename}`,
          uploadedById: userId,
        },
      });

      // Delete old avatar file if exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { avatarAttachment: true },
      });
      if (user?.avatarAttachment) {
        const oldPath = path.join(__dirname, '../../uploads', user.avatarAttachment.path);
        fs.unlink(oldPath, () => {}); // ignore errors
        await prisma.attachment.delete({ where: { id: user.avatarAttachment.id } });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { avatarAttachmentId: attachment.id, avatarUrl: null },
      });

      res.status(201).json({
        attachment: {
          id: attachment.id,
          filename: attachment.filename,
          url: `/uploads/${attachment.path}`,
          mimeType: attachment.mimeType,
          size: attachment.size,
        },
      });
    } catch (err) {
      next(err);
    }
  });
});

// POST /api/upload/cover/:slug
router.post('/cover/:slug', requireMember('admin'), (req: Request, res: Response, next: NextFunction) => {
  uploadCover(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
      const group = (req as any).group;
      const file = req.file;

      const attachment = await prisma.attachment.create({
        data: {
          filename: file.originalname,
          storedName: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          path: `covers/${file.filename}`,
          uploadedById: (req.user as any).id,
        },
      });

      // Delete old cover file if exists
      const existingGroup = await prisma.group.findUnique({
        where: { id: group.id },
        include: { coverAttachment: true },
      });
      if (existingGroup?.coverAttachment) {
        const oldPath = path.join(__dirname, '../../uploads', existingGroup.coverAttachment.path);
        fs.unlink(oldPath, () => {});
        await prisma.attachment.delete({ where: { id: existingGroup.coverAttachment.id } });
      }

      await prisma.group.update({
        where: { id: group.id },
        data: { coverAttachmentId: attachment.id, imageUrl: null },
      });

      res.status(201).json({
        attachment: {
          id: attachment.id,
          filename: attachment.filename,
          url: `/uploads/${attachment.path}`,
          mimeType: attachment.mimeType,
          size: attachment.size,
        },
      });
    } catch (err) {
      next(err);
    }
  });
});

// DELETE /api/attachments/:id
router.delete('/attachments/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attachmentId = paramString(req.params.id);
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found.' });
    }

    const userId = (req.user as any).id;
    if (attachment.uploadedById !== userId) {
      return res.status(403).json({ error: 'You can only delete your own attachments.' });
    }

    // Remove file from disk
    const filePath = path.join(__dirname, '../../uploads', attachment.path);
    fs.unlink(filePath, () => {});

    // Clear references
    await prisma.user.updateMany({ where: { avatarAttachmentId: attachmentId }, data: { avatarAttachmentId: null } });
    await prisma.group.updateMany({ where: { coverAttachmentId: attachmentId }, data: { coverAttachmentId: null } });

    await prisma.attachment.delete({ where: { id: attachmentId } });
    res.json({ message: 'Attachment deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
