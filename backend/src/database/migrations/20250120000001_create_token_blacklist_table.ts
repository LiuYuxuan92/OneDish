import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('token_blacklist', (table) => {
    table.string('token', 500).primary();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 添加索引以提高查询性能
  await knex.schema.raw('CREATE INDEX idx_token_blacklist_expires_at ON token_blacklist(expires_at)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('token_blacklist');
}
