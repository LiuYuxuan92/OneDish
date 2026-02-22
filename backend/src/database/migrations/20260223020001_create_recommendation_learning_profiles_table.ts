import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('recommendation_learning_profiles');
  if (exists) return;

  await knex.schema.createTable('recommendation_learning_profiles', (table) => {
    table.string('id', 128).primary();
    table.string('user_id', 64).notNullable().index();
    table.string('meal_type', 16).notNullable().index();
    table.text('weight_config').nullable();
    table.text('signal_snapshot').nullable();
    table.timestamp('computed_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['user_id', 'meal_type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('recommendation_learning_profiles');
  if (!exists) return;
  await knex.schema.dropTable('recommendation_learning_profiles');
}
