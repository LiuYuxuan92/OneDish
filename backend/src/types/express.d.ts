import 'express';
import type { Multer } from 'multer';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      requestStartAt?: number;
      file?: Multer.File;
      user?: {
        user_id: string;
        username?: string;
        role?: 'user' | 'admin';
        tier?: 'free' | 'pro' | 'enterprise';
      };
    }
  }
}

export {};
