import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('meal_plans', (table) => {
    table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('plan_date').notNullable();
    table.string('meal_type', 20).notNullable();
    table.string('recipe_id').notNullable().references('id').inTable('recipes');
    table.integer('servings').defaultTo(2);
    table.text('notes');
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'plan_date', 'meal_type']);
    table.index(['user_id', 'plan_date']);
    table.index('recipe_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('meal_plans');
}
