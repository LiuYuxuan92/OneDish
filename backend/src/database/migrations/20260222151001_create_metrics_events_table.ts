import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('metrics_events');
  if (exists) return;

  await knex.schema.createTable('metrics_events', (table) => {
    table.uuid('id').primary();
    table.string('event_name', 64).notNullable().index();
    table.timestamp('event_time').notNullable().index();
    table.string('user_id', 64).nullable().index();
    table.string('anonymous_id', 128).notNullable().index();
    table.string('session_id', 128).notNullable();
    table.string('platform', 16).notNullable();
    table.string('app_version', 32).notNullable();
    table.string('page_id', 64).notNullable();
    table.text('page_url').notNullable();
    table.text('payload').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('metrics_events');
  if (!exists) return;

  await knex.schema.dropTable('metrics_events');
}
