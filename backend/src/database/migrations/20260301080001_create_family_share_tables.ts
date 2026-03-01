import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasShoppingShares = await knex.schema.hasTable('shopping_list_shares');
  if (!hasShoppingShares) {
    await knex.schema.createTable('shopping_list_shares', (table) => {
      table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
      table.string('list_id').notNullable().references('id').inTable('shopping_lists').onDelete('CASCADE');
      table.string('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('invite_code', 24).notNullable().unique().index();
      table.string('share_link', 255).notNullable();
      table.datetime('created_at').defaultTo(knex.fn.now());
      table.unique(['list_id', 'owner_id']);
    });
  }

  const hasShoppingMembers = await knex.schema.hasTable('shopping_list_share_members');
  if (!hasShoppingMembers) {
    await knex.schema.createTable('shopping_list_share_members', (table) => {
      table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
      table.string('share_id').notNullable().references('id').inTable('shopping_list_shares').onDelete('CASCADE');
      table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.datetime('joined_at').defaultTo(knex.fn.now());
      table.unique(['share_id', 'user_id']);
    });
  }

  const hasPlanShares = await knex.schema.hasTable('meal_plan_shares');
  if (!hasPlanShares) {
    await knex.schema.createTable('meal_plan_shares', (table) => {
      table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
      table.string('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('member_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('invite_code', 24).notNullable().unique().index();
      table.string('share_link', 255).notNullable();
      table.datetime('created_at').defaultTo(knex.fn.now());
      table.unique(['owner_id']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('meal_plan_shares')) {
    await knex.schema.dropTable('meal_plan_shares');
  }

  if (await knex.schema.hasTable('shopping_list_share_members')) {
    await knex.schema.dropTable('shopping_list_share_members');
  }

  if (await knex.schema.hasTable('shopping_list_shares')) {
    await knex.schema.dropTable('shopping_list_shares');
  }
}
