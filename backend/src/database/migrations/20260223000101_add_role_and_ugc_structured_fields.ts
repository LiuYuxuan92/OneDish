import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('role').notNullable().defaultTo('user');
    table.index(['role']);
  });

  await knex.schema.alterTable('user_recipes', (table) => {
    table.string('baby_age_range');
    table.json('allergens');
    table.boolean('is_one_pot');
    table.json('step_branches');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_recipes', (table) => {
    table.dropColumn('baby_age_range');
    table.dropColumn('allergens');
    table.dropColumn('is_one_pot');
    table.dropColumn('step_branches');
  });

  await knex.schema.alterTable('users', (table) => {
    table.dropIndex(['role']);
    table.dropColumn('role');
  });
}
