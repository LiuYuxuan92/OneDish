import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('users', 'wechat_openid');
  if (!hasColumn) {
    return knex.schema.alterTable('users', (table) => {
      table.string('wechat_openid', 100).unique().nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('wechat_openid');
  });
}
