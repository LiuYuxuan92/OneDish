import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasItemsV2 = await knex.schema.hasColumn('shopping_lists', 'items_v2');
  const hasSchemaVersion = await knex.schema.hasColumn('shopping_lists', 'schema_version');

  await knex.schema.alterTable('shopping_lists', (table) => {
    if (!hasItemsV2) {
      table.json('items_v2').nullable();
    }
    if (!hasSchemaVersion) {
      table.integer('schema_version').notNullable().defaultTo(1);
    }
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasItemsV2 = await knex.schema.hasColumn('shopping_lists', 'items_v2');
  const hasSchemaVersion = await knex.schema.hasColumn('shopping_lists', 'schema_version');

  await knex.schema.alterTable('shopping_lists', (table) => {
    if (hasItemsV2) {
      table.dropColumn('items_v2');
    }
    if (hasSchemaVersion) {
      table.dropColumn('schema_version');
    }
  });
}