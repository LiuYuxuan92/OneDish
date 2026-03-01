import { db, closeConnection } from '../config/database';

async function main() {
  const now = new Date().toISOString();

  const expiredRows = await db('share_invite_revocations')
    .whereNotNull('expires_at')
    .andWhere('expires_at', '<=', now)
    .count<{ count: number }[]>({ count: '*' });

  const totalExpired = Number((expiredRows?.[0] as any)?.count || 0);

  const deleted = await db('share_invite_revocations')
    .whereNotNull('expires_at')
    .andWhere('expires_at', '<=', now)
    .del();

  // 兼容历史数据：如果没有 expires_at，则按 revoked_at + TTL 判断
  const fallbackTtlDays = Math.max(1, Number(process.env.SHARE_INVITE_REVOCATION_TTL_DAYS || 30));
  const fallbackBoundary = new Date(Date.now() - fallbackTtlDays * 24 * 60 * 60 * 1000).toISOString();

  const legacyDeleted = await db('share_invite_revocations')
    .whereNull('expires_at')
    .andWhere('revoked_at', '<=', fallbackBoundary)
    .del();

  console.log(JSON.stringify({
    ok: true,
    scanned_expired: totalExpired,
    deleted,
    deleted_legacy: legacyDeleted,
    at: now,
  }));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: String(error) }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeConnection();
  });
