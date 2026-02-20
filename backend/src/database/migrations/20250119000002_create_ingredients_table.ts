import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('ingredients', (table) => {
    table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    table.string('name', 50).notNullable().unique();
    table.string('name_en', 50);
    table.string('category', 50).notNullable();
    table.string('unit', 20);
    table.decimal('average_price', 10, 2);
    table.string('price_unit', 20);
    table.integer('shelf_life');
    table.string('storage_area', 50);
    table.json('nutrition_per_100g');
    table.string('image_url', 255);
    table.datetime('created_at').defaultTo(knex.fn.now());

    table.index('category');
    table.index('storage_area');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('ingredients');
}
