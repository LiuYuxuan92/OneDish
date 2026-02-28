import 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      requestStartAt?: number;
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
