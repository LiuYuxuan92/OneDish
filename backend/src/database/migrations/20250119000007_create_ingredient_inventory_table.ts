import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('ingredient_inventory', (table) => {
    table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    table.string('user_id', 50).notNullable();
    table.string('ingredient_id', 50).notNullable();
    table.string('ingredient_name', 100).notNullable();
    table.decimal('quantity', 10, 2).notNullable().defaultTo(1);
    table.string('unit', 20).notNullable();
    table.date('expiry_date');
    table.date('purchase_date');
    table.string('location', 50).defaultTo('冷藏');
    table.text('notes');
    table.boolean('is_active').defaultTo(true);
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('ingredient_id');
    table.index('expiry_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('ingredient_inventory');
}
