import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('feeding_feedbacks');
  if (exists) return;

  await knex.schema.createTable('feeding_feedbacks', (table) => {
    table.uuid('id').primary();
    table.string('user_id', 64).notNullable().index();
    table.string('recipe_id', 64).notNullable().index();
    table.string('meal_plan_id', 64).nullable().index();
    table.integer('baby_age_at_that_time').nullable();
    table.string('accepted_level', 16).notNullable().index();
    table.boolean('allergy_flag').notNullable().defaultTo(false);
    table.text('note').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).index();
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'created_at']);
    table.index(['user_id', 'recipe_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('feeding_feedbacks');
  if (!exists) return;

  await knex.schema.dropTable('feeding_feedbacks');
}
