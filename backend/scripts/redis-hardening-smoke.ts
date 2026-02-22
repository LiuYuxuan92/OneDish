import { quotaService } from '../src/services/quota.service';
import { redisService } from '../src/services/redis.service';
import { idempotencyService } from '../src/services/idempotency.service';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function run(): Promise<void> {
  const results: Array<{ id: string; ok: boolean; note?: string }> = [];

  // TC01: 用户配额限制命中
  try {
    const userId = `tc01_${Date.now()}`;
    const backupTier = JSON.parse(JSON.stringify((quotaService as any).tierQuota));
    (quotaService as any).tierQuota.free.ai_limit = 2;

    const a1 = await quotaService.consume(userId, 'free', 'ai');
    const a2 = await quotaService.consume(userId, 'free', 'ai');
    const a3 = await quotaService.consume(userId, 'free', 'ai');

    assert(a1.allowed && a2.allowed, 'TC01 前两次应放行');
    assert(!a3.allowed && a3.reason === 'user', 'TC01 第三次应因用户配额拒绝');

    (quotaService as any).tierQuota = backupTier;
    results.push({ id: 'TC01', ok: true });
  } catch (error) {
    results.push({ id: 'TC01', ok: false, note: (error as Error).message });
  }

  // TC02: 全局配额限制命中
  try {
    const backupGlobal = { ...(quotaService as any).globalLimit };
    (quotaService as any).globalLimit.ai_limit = 1;
    (quotaService as any).globalDaily.clear();

    const b1 = await quotaService.consume(`tc02_u1_${Date.now()}`, 'free', 'ai');
    const b2 = await quotaService.consume(`tc02_u2_${Date.now()}`, 'free', 'ai');

    assert(b1.allowed, 'TC02 第一次应放行');
    assert(!b2.allowed && b2.reason === 'global', 'TC02 第二次应因全局配额拒绝');

    (quotaService as any).globalLimit = backupGlobal;
    results.push({ id: 'TC02', ok: true });
  } catch (error) {
    results.push({ id: 'TC02', ok: false, note: (error as Error).message });
  }

  // TC03: 搜索缓存键稳定性
  try {
    const key1 = quotaService.makeSearchCacheKey(' 红烧肉 ', { a: 1 }, 'free');
    const key2 = quotaService.makeSearchCacheKey('红烧肉', { a: 1 }, 'free');
    const key3 = quotaService.makeSearchCacheKey('红烧肉', { a: 1 }, 'pro');
    assert(key1 === key2, 'TC03 相同语义请求应命中同一个缓存键');
    assert(key1 !== key3, 'TC03 不同 tier 应产生不同缓存键');
    results.push({ id: 'TC03', ok: true });
  } catch (error) {
    results.push({ id: 'TC03', ok: false, note: (error as Error).message });
  }

  // TC04: Redis 故障注入下配额降级不阻断主流程
  try {
    const prev = process.env.REDIS_FAULT_INJECT_MODE;
    process.env.REDIS_FAULT_INJECT_MODE = 'eval,mget,get,set';
    const c1 = await quotaService.consume(`tc04_${Date.now()}`, 'free', 'web');
    process.env.REDIS_FAULT_INJECT_MODE = prev;
    assert(c1.allowed, 'TC04 Redis 注入故障时应降级到内存并继续放行');
    results.push({ id: 'TC04', ok: true });
  } catch (error) {
    results.push({ id: 'TC04', ok: false, note: (error as Error).message });
  }

  // TC05: 幂等键重复请求重放
  try {
    const key = `tc05_${Date.now()}`;
    const body = { query: '番茄鸡蛋' };
    const begin1 = await idempotencyService.begin('search-resolve', key, body, 60);
    assert(begin1.state === 'proceed', 'TC05 首次请求应 proceed');
    await idempotencyService.complete('search-resolve', key, body, { code: 200, data: { route: 'local' } }, 60);

    const begin2 = await idempotencyService.begin('search-resolve', key, body, 60);
    assert(begin2.state === 'replay', 'TC05 重复请求应 replay');

    const replay = await idempotencyService.replay('search-resolve', key);
    assert(!!replay, 'TC05 replay 数据应可读');
    results.push({ id: 'TC05', ok: true });
  } catch (error) {
    results.push({ id: 'TC05', ok: false, note: (error as Error).message });
  }

  // TC06: 幂等键冲突校验（同 key 不同 payload）
  try {
    const key = `tc06_${Date.now()}`;
    const b1 = await idempotencyService.begin('search-resolve', key, { query: 'a' }, 60);
    assert(b1.state === 'proceed', 'TC06 首次应 proceed');
    const b2 = await idempotencyService.begin('search-resolve', key, { query: 'b' }, 60);
    assert(b2.state === 'conflict', 'TC06 同 key 不同 payload 应 conflict');
    results.push({ id: 'TC06', ok: true });
  } catch (error) {
    results.push({ id: 'TC06', ok: false, note: (error as Error).message });
  }

  // TC07: Redis 原子 quota 脚本失败时不抛错
  try {
    const prev = process.env.REDIS_FAULT_INJECT_MODE;
    process.env.REDIS_FAULT_INJECT_MODE = 'eval';
    const result = await redisService.evalQuotaConsume(['k:u', 'k:g'], [1, 1], 60);
    process.env.REDIS_FAULT_INJECT_MODE = prev;
    assert(result.allowed === false, 'TC07 注入 eval 失败时应返回拒绝结果');
    results.push({ id: 'TC07', ok: true });
  } catch (error) {
    results.push({ id: 'TC07', ok: false, note: (error as Error).message });
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  console.log('=== Redis Hardening Smoke ===');
  for (const item of results) {
    console.log(`${item.ok ? '✅' : '❌'} ${item.id}${item.note ? ` - ${item.note}` : ''}`);
  }
  console.log(`Summary: passed=${passed}, failed=${failed}, total=${results.length}`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('Smoke failed:', error);
  process.exit(1);
});
