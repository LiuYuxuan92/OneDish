import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_recipes', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('source').notNullable().defaultTo('search'); // 'search' | 'ai' | 'tianxing'
    table.json('original_data'); // 原始搜索结果 JSON
    table.string('name').notNullable();
    table.string('type'); // breakfast/lunch/dinner/snack
    table.integer('prep_time');
    table.string('difficulty');
    table.string('servings');
    table.json('adult_version'); // RecipeVersion JSON
    table.json('baby_version'); // RecipeVersion JSON
    table.json('cooking_tips'); // string[] JSON
    table.json('image_url'); // string[] JSON
    table.json('tags'); // string[] JSON
    table.json('category'); // string[] JSON
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    table.index(['user_id', 'is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_recipes');
}
