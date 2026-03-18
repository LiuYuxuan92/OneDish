import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('feeding_feedbacks');
  if (!exists) return;

  const hasColumn = await knex.schema.hasColumn('feeding_feedbacks', 'image_urls');
  if (hasColumn) return;

  await knex.schema.alterTable('feeding_feedbacks', (table) => {
    table.json('image_urls').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('feeding_feedbacks');
  if (!exists) return;

  const hasColumn = await knex.schema.hasColumn('feeding_feedbacks', 'image_urls');
  if (!hasColumn) return;

  await knex.schema.alterTable('feeding_feedbacks', (table) => {
    table.dropColumn('image_urls');
  });
}
