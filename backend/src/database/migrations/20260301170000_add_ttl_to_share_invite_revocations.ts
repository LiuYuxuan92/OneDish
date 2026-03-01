import { Knex } from 'knex';

const DEFAULT_TTL_DAYS = 30;

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('share_invite_revocations');
  if (!hasTable) return;

  const hasExpiresAt = await knex.schema.hasColumn('share_invite_revocations', 'expires_at');
  if (!hasExpiresAt) {
    await knex.schema.alterTable('share_invite_revocations', (table) => {
      table.datetime('expires_at').nullable().index();
    });
  }

  const rows = await knex('share_invite_revocations').select('id', 'revoked_at', 'expires_at');
  for (const row of rows) {
    if (row.expires_at) continue;

    const revokedAt = row.revoked_at ? new Date(row.revoked_at) : new Date();
    const expiresAt = new Date(revokedAt.getTime() + DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000);

    await knex('share_invite_revocations').where('id', row.id).update({
      expires_at: expiresAt.toISOString(),
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('share_invite_revocations');
  if (!hasTable) return;

  const hasExpiresAt = await knex.schema.hasColumn('share_invite_revocations', 'expires_at');
  if (hasExpiresAt) {
    await knex.schema.alterTable('share_invite_revocations', (table) => {
      table.dropColumn('expires_at');
    });
  }
}
