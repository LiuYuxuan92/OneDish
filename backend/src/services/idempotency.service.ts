import { createHash } from 'crypto';
import { redisKeyService } from './redis-key.service';
import { redisService } from './redis.service';

interface MemoryRecord {
  status: 'pending' | 'done';
  fingerprint: string;
  payload?: unknown;
  expiresAt: number;
}

class IdempotencyService {
  private cache = new Map<string, MemoryRecord>();

  begin(namespace: string, idempotencyKey: string, requestBody: unknown, ttlSec: number) {
    const fingerprint = this.fingerprint(requestBody);
    const redisKey = redisKeyService.idempotency(namespace, idempotencyKey);
    return this.beginInner(redisKey, fingerprint, ttlSec);
  }

  async complete(namespace: string, idempotencyKey: string, requestBody: unknown, payload: unknown, ttlSec: number): Promise<void> {
    const fingerprint = this.fingerprint(requestBody);
    const redisKey = redisKeyService.idempotency(namespace, idempotencyKey);
    const value = JSON.stringify({ status: 'done', fp: fingerprint, payload });

    const ok = await redisService.setRaw(redisKey, value, ttlSec);
    if (!ok) {
      this.cache.set(redisKey, { status: 'done', fingerprint, payload, expiresAt: Date.now() + ttlSec * 1000 });
    }
  }

  async replay(namespace: string, idempotencyKey: string): Promise<unknown | null> {
    const redisKey = redisKeyService.idempotency(namespace, idempotencyKey);
    const raw = await redisService.getRaw(redisKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { status: 'pending' | 'done'; payload?: unknown };
        if (parsed.status === 'done') return parsed.payload ?? null;
      } catch {
        return null;
      }
    }

    const local = this.cache.get(redisKey);
    if (!local) return null;
    if (local.expiresAt <= Date.now()) {
      this.cache.delete(redisKey);
      return null;
    }
    return local.status === 'done' ? local.payload ?? null : null;
  }

  private async beginInner(redisKey: string, fingerprint: string, ttlSec: number): Promise<{ state: 'proceed' | 'replay' | 'conflict' }> {
    const redisState = await redisService.evalIdempotencyBegin(redisKey, fingerprint, ttlSec);
    if (redisService.isRedisReady()) return redisState;

    const now = Date.now();
    const local = this.cache.get(redisKey);
    if (!local || local.expiresAt <= now) {
      this.cache.set(redisKey, { status: 'pending', fingerprint, expiresAt: now + ttlSec * 1000 });
      return { state: 'proceed' };
    }

    if (local.fingerprint !== fingerprint) return { state: 'conflict' };
    if (local.status === 'done') return { state: 'replay' };
    return { state: 'conflict' };
  }

  private fingerprint(body: unknown): string {
    const normalized = JSON.stringify(body ?? {});
    return createHash('sha1').update(normalized).digest('hex');
  }
}

export const idempotencyService = new IdempotencyService();
