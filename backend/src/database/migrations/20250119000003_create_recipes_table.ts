import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('recipes', (table) => {
    table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    table.string('name', 100).notNullable();
    table.string('name_en', 100);
    table.string('type', 20).notNullable();
    table.json('category');
    table.integer('prep_time').notNullable();
    table.integer('cook_time');
    table.integer('total_time');
    table.string('difficulty', 20).notNullable();
    table.string('servings', 20).notNullable();
    table.json('adult_version').notNullable();
    table.json('baby_version');
    table.json('cooking_tips');
    table.json('nutrition_info');
    table.json('image_url');
    table.string('video_url', 255);
    table.json('tags');
    table.boolean('is_active').defaultTo(true);
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.datetime('updated_at').defaultTo(knex.fn.now());

    table.index('type');
    table.index('prep_time');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('recipes');
}
