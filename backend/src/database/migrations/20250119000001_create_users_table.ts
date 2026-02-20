import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    table.string('username', 50).notNullable().unique();
    table.string('email', 100).unique();
    table.string('password_hash', 255).notNullable();
    table.string('phone', 20);
    table.string('avatar_url', 255);
    table.integer('family_size').defaultTo(2);
    table.integer('baby_age');
    table.json('preferences').defaultTo('{}');
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());

    table.index('email');
    table.index('phone');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
}
