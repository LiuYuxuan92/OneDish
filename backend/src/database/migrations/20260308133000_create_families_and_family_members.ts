import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasFamilies = await knex.schema.hasTable('families');
  if (!hasFamilies) {
    await knex.schema.createTable('families', (table) => {
      table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
      table.string('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE').index();
      table.string('name', 120).notNullable();
      table.string('invite_code', 24).notNullable().unique().index();
      table.datetime('created_at').defaultTo(knex.fn.now());
      table.datetime('updated_at').defaultTo(knex.fn.now());
      table.unique(['owner_id']);
    });
  }

  const hasFamilyMembers = await knex.schema.hasTable('family_members');
  if (!hasFamilyMembers) {
    await knex.schema.createTable('family_members', (table) => {
      table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
      table.string('family_id').notNullable().references('id').inTable('families').onDelete('CASCADE').index();
      table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').index();
      table.string('role', 16).notNullable().defaultTo('member');
      table.datetime('joined_at').defaultTo(knex.fn.now());
      table.unique(['family_id', 'user_id']);
      table.unique(['user_id']);
    });
  }

  const mealPlansHasFamilyId = await knex.schema.hasColumn('meal_plans', 'family_id');
  if (!mealPlansHasFamilyId) {
    await knex.schema.alterTable('meal_plans', (table) => {
      table.string('family_id').nullable().references('id').inTable('families').onDelete('SET NULL').index();
    });
  }

  const shoppingListsHasFamilyId = await knex.schema.hasColumn('shopping_lists', 'family_id');
  if (!shoppingListsHasFamilyId) {
    await knex.schema.alterTable('shopping_lists', (table) => {
      table.string('family_id').nullable().references('id').inTable('families').onDelete('SET NULL').index();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const shoppingListsHasFamilyId = await knex.schema.hasColumn('shopping_lists', 'family_id');
  if (shoppingListsHasFamilyId) {
    await knex.schema.alterTable('shopping_lists', (table) => {
      table.dropColumn('family_id');
    });
  }

  const mealPlansHasFamilyId = await knex.schema.hasColumn('meal_plans', 'family_id');
  if (mealPlansHasFamilyId) {
    await knex.schema.alterTable('meal_plans', (table) => {
      table.dropColumn('family_id');
    });
  }

  if (await knex.schema.hasTable('family_members')) {
    await knex.schema.dropTable('family_members');
  }

  if (await knex.schema.hasTable('families')) {
    await knex.schema.dropTable('families');
  }
}
