import 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      requestStartAt?: number;
      user?: {
        userId?: string;
        id?: string;
        tier?: 'free' | 'pro' | 'enterprise';
      };
    }
  }
}

export {};
