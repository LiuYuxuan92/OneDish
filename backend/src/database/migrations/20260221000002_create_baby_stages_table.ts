import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('baby_stages', (table) => {
    table.string('stage', 20).primary();
    table.string('name', 50).notNullable();
    table.string('age_range', 30).notNullable();
    table.integer('age_min').notNullable();
    table.integer('age_max').notNullable();
    table.json('can_eat').notNullable();
    table.json('cannot_eat').notNullable();
    table.string('texture_desc', 100).notNullable();
    table.string('meal_frequency', 100).notNullable();
    table.json('key_nutrients').notNullable();
    table.json('guide_tips').notNullable();
    table.datetime('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('baby_stages');
}
