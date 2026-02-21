import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('recipes', (table) => {
    table.string('stage', 20).defaultTo('adult').index();
    table.boolean('first_intro').defaultTo(false);
    table.json('key_nutrients').defaultTo('[]');
    table.json('scene_tags').defaultTo('[]');
    table.string('texture_level', 20).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('recipes', (table) => {
    table.dropColumn('stage');
    table.dropColumn('first_intro');
    table.dropColumn('key_nutrients');
    table.dropColumn('scene_tags');
    table.dropColumn('texture_level');
  });
}
