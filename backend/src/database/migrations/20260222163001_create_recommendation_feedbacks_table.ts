import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('recommendation_feedbacks');
  if (exists) return;

  await knex.schema.createTable('recommendation_feedbacks', (table) => {
    table.uuid('id').primary();
    table.string('user_id', 64).notNullable().index();
    table.string('meal_type', 16).notNullable().index();
    table.string('selected_option', 8).notNullable().index();
    table.string('reject_reason', 255).nullable();
    table.timestamp('event_time').notNullable().index();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'event_time']);
  });
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('recommendation_feedbacks');
  if (!exists) return;

  await knex.schema.dropTable('recommendation_feedbacks');
}
