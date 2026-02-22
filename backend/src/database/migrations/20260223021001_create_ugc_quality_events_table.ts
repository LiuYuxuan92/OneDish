import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('ugc_quality_events');
  if (exists) return;

  await knex.schema.createTable('ugc_quality_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.uuid('user_recipe_id').notNullable().references('id').inTable('user_recipes').onDelete('CASCADE');
    table.string('actor_user_id', 64).nullable();
    table.string('event_type', 16).notNullable(); // report | adoption
    table.integer('event_value').notNullable().defaultTo(0);
    table.json('payload').nullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_recipe_id', 'event_type']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('ugc_quality_events');
  if (!exists) return;
  await knex.schema.dropTable('ugc_quality_events');
}
