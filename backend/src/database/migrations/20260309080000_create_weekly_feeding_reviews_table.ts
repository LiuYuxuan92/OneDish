import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('weekly_feeding_reviews');
  if (exists) return;

  await knex.schema.createTable('weekly_feeding_reviews', (table) => {
    table.uuid('id').primary();
    table.string('scope_type', 16).notNullable(); // 'user' | 'family'
    table.string('scope_id', 64).notNullable();   // user_id 或 family_id
    table.string('child_id', 64).nullable().index(); // 关联的宝宝记录
    table.date('week_start').notNullable();        // ISO date: 2026-03-02
    table.date('week_end').notNullable();          // ISO date: 2026-03-08
    table.jsonb('review_json').notNullable();       // JSON blob
    table.timestamp('generated_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['scope_type', 'scope_id', 'child_id', 'week_start']);
    table.index(['scope_type', 'scope_id', 'week_start']);
    table.index(['child_id', 'week_start']);
  });
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('weekly_feeding_reviews');
  if (!exists) return;

  await knex.schema.dropTable('weekly_feeding_reviews');
}
