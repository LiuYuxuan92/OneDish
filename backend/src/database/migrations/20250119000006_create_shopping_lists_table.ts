import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('shopping_lists', (table) => {
    table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('list_date').notNullable();
    table.json('items').notNullable();
    table.decimal('total_estimated_cost', 10, 2);
    table.boolean('is_completed').defaultTo(false);
    table.datetime('created_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'list_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('shopping_lists');
}
