import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('meal_plan_templates');
  if (!hasTable) {
    await knex.schema.createTable('meal_plan_templates', (table) => {
      table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
      table.string('creator_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('title').notNullable();
      table.text('description');
      table.jsonb('plan_data').notNullable(); // { monday: { breakfast: recipe_id, lunch: recipe_id, dinner: recipe_id }, ... }
      table.integer('baby_age_start_months'); // 适用月龄范围
      table.integer('baby_age_end_months');
      table.jsonb('tags').defaultTo('[]'); // ['清淡', '快手', '营养']
      table.integer('clone_count').defaultTo(0);
      table.boolean('is_public').defaultTo(true);
      table.datetime('created_at').defaultTo(knex.fn.now());
      table.datetime('updated_at').defaultTo(knex.fn.now());
      
      table.index('creator_user_id');
      table.index('is_public');
      table.index('baby_age_start_months');
      table.index('baby_age_end_months');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('meal_plan_templates')) {
    await knex.schema.dropTable('meal_plan_templates');
  }
}
