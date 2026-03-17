import { Request, Response } from 'express';
import multer from 'multer';
import { cosService } from '../services/cos.service';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MULTER_UNSUPPORTED_FILE_CODE = 'LIMIT_UNEXPECTED_FILE';
const MULTER_FILE_TOO_LARGE_CODE = 'LIMIT_FILE_SIZE';

export class UploadController {
  uploadImage = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.user_id;
      const file = req.file;

      if (!userId) {
        return res.status(401).json({
          code: 401,
          message: '未授权',
          data: null,
        });
      }

      if (!file) {
        return res.status(400).json({
          code: 400,
          message: '请上传图片文件',
          data: null,
        });
      }

      if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
        return res.status(415).json({
          code: 415,
          message: '仅支持 jpeg/png/webp 图片',
          data: null,
        });
      }

      const result = await cosService.uploadBuffer({
        userId,
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
      });

      return res.json({
        code: 200,
        message: '上传成功',
        data: {
          key: result.key,
          url: result.url,
          mime_type: result.mimeType,
          size: result.size,
        },
      });
    } catch (error) {
      if (error instanceof multer.MulterError) {
        if (error.code === MULTER_FILE_TOO_LARGE_CODE) {
          return res.status(413).json({
            code: 413,
            message: '图片大小不能超过 5MB',
            data: null,
          });
        }

        if (error.code === MULTER_UNSUPPORTED_FILE_CODE) {
          return res.status(400).json({
            code: 400,
            message: '仅支持单文件上传，字段名必须为 file',
            data: null,
          });
        }
      }

      if (error instanceof Error && 'statusCode' in error) {
        const appError = error as ReturnType<typeof createError>;
        return res.status(appError.statusCode || 500).json({
          code: appError.code || appError.statusCode || 500,
          message: appError.message,
          data: null,
        });
      }

      logger.error('Failed to upload image', { error });
      return res.status(500).json({
        code: 500,
        message: '图片上传失败',
        data: null,
      });
    }
  };
}
