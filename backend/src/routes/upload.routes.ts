import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const uploadController = new UploadController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(null, false);
    }

    return cb(null, true);
  },
});

router.post('/image', authenticate, upload.single('file'), uploadController.uploadImage);

export default router;
