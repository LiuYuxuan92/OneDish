import crypto from 'crypto';
import { db } from '../config/database';
import { logger } from '../utils/logger';

const TOKEN_BLACKLIST_TABLE = 'token_blacklist';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class TokenBlacklistService {
  async isBlacklisted(token: string): Promise<boolean> {
    const tokenHash = hashToken(token);

    try {
      const result = await db(TOKEN_BLACKLIST_TABLE)
        .where('token', tokenHash)
        .orWhere('token', token)
        .first();
      return !!result;
    } catch (error) {
      logger.error('Failed to query token blacklist', { error });
      return false;
    }
  }

  async blacklistToken(token: string, expiresAt: Date): Promise<void> {
    const tokenHash = hashToken(token);

    try {
      await db(TOKEN_BLACKLIST_TABLE)
        .insert({
          token: tokenHash,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        })
        .onConflict('token')
        .ignore();
    } catch (error) {
      logger.error('Failed to blacklist token', { error });
      throw error;
    }
  }

  async cleanupExpiredTokens(): Promise<void> {
    try {
      await db(TOKEN_BLACKLIST_TABLE)
        .where('expires_at', '<', new Date().toISOString())
        .delete();
      logger.info('Expired blacklisted tokens cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup token blacklist', { error });
    }
  }

  startCleanupJob(intervalMs = 60 * 60 * 1000): void {
    setInterval(() => {
      void this.cleanupExpiredTokens();
    }, intervalMs);
  }
}

export const tokenBlacklistService = new TokenBlacklistService();
