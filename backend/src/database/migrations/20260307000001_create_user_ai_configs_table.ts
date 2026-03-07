import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('user_ai_configs');
  if (!hasTable) {
    await knex.schema.createTable('user_ai_configs', (table) => {
      table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
      table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('provider').notNullable();
      table.text('api_key_encrypted').notNullable();
      table.text('base_url');
      table.string('model');
      table.boolean('is_active').defaultTo(true);
      table.string('display_name');
      table.integer('monthly_limit_tokens');
      table.datetime('created_at').defaultTo(knex.fn.now());
      table.datetime('updated_at').defaultTo(knex.fn.now());

      table.index('user_id');
      table.index('provider');
      table.index('is_active');

      // 每个用户每个 provider 只能有一个配置
      table.unique(['user_id', 'provider']);
    });

    // 注意: provider 验证在应用层实现 (controller 中)
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('user_ai_configs')) {
    await knex.schema.dropTable('user_ai_configs');
  }
}
