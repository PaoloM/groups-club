import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function createStorage(category: string) {
  const uploadDir = path.join(__dirname, '../../uploads', category);
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const storedName = `${crypto.randomUUID()}${ext}`;
      cb(null, storedName);
    },
  });
}

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
  cb(null, true);
}

export const uploadAvatar = multer({
  storage: createStorage('avatars'),
  fileFilter,
  limits: { fileSize: MAX_SIZE },
}).single('file');

export const uploadCover = multer({
  storage: createStorage('covers'),
  fileFilter,
  limits: { fileSize: MAX_SIZE },
}).single('file');

export const uploadAttachments = multer({
  storage: createStorage('attachments'),
  fileFilter,
  limits: { fileSize: MAX_SIZE },
}).array('files', 4);
