import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('meal_plans', (table) => {
    table.integer('baby_age_months').nullable();
    table.boolean('is_baby_suitable').defaultTo(false);
    table.json('nutrition_score').nullable();
    table.boolean('is_completed').defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('meal_plans', (table) => {
    table.dropColumn('baby_age_months');
    table.dropColumn('is_baby_suitable');
    table.dropColumn('nutrition_score');
    table.dropColumn('is_completed');
  });
}
