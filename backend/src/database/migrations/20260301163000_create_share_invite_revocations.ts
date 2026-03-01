import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('share_invite_revocations');
  if (hasTable) return;

  await knex.schema.createTable('share_invite_revocations', (table) => {
    table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    table.string('share_type', 32).notNullable().index();
    table.string('share_id').notNullable().index();
    table.string('invite_code', 32).notNullable().index();
    table.string('revoked_by').nullable();
    table.datetime('revoked_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['share_type', 'invite_code']);
  });
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('share_invite_revocations')) {
    await knex.schema.dropTable('share_invite_revocations');
  }
}
