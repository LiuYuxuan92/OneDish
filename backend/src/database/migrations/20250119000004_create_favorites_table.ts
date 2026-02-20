import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('favorites', (table) => {
    table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('recipe_id').notNullable().references('id').inTable('recipes').onDelete('CASCADE');
    table.datetime('created_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'recipe_id']);
    table.index('user_id');
    table.index('recipe_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('favorites');
}
