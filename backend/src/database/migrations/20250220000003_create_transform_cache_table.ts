import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('transform_cache', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('recipe_id').notNullable();
    table.integer('baby_age_months').notNullable();
    table.text('result').notNullable(); // JSON
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    table.unique(['recipe_id', 'baby_age_months']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transform_cache');
}
