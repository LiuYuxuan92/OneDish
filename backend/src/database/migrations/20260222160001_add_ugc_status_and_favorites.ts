import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_recipes', (table) => {
    table.string('status').notNullable().defaultTo('draft'); // draft|pending|published|rejected
    table.datetime('submitted_at');
    table.datetime('published_at');
    table.datetime('rejected_at');
    table.string('reject_reason');
  });

  await knex.schema.createTable('user_recipe_favorites', (table) => {
    table.string('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('user_recipe_id').notNullable().references('id').inTable('user_recipes').onDelete('CASCADE');
    table.datetime('created_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'user_recipe_id']);
    table.index(['user_id']);
    table.index(['user_recipe_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_recipe_favorites');

  await knex.schema.alterTable('user_recipes', (table) => {
    table.dropColumn('status');
    table.dropColumn('submitted_at');
    table.dropColumn('published_at');
    table.dropColumn('rejected_at');
    table.dropColumn('reject_reason');
  });
}
