import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasUpdatedAt = await knex.schema.hasColumn('shopping_lists', 'updated_at');
  if (hasUpdatedAt) return;

  await knex.schema.alterTable('shopping_lists', (table) => {
    table.datetime('updated_at').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasUpdatedAt = await knex.schema.hasColumn('shopping_lists', 'updated_at');
  if (!hasUpdatedAt) return;

  await knex.schema.alterTable('shopping_lists', (table) => {
    table.dropColumn('updated_at');
  });
}
