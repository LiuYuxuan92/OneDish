import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_recipes', (table) => {
    table.integer('quality_score').notNullable().defaultTo(0);
    table.boolean('in_recommend_pool').notNullable().defaultTo(false);
    table.integer('report_count').notNullable().defaultTo(0);
    table.float('adoption_rate').notNullable().defaultTo(0);
  });

  await knex.schema.alterTable('user_recipes', (table) => {
    table.index(['status', 'in_recommend_pool']);
    table.index(['quality_score']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_recipes', (table) => {
    table.dropIndex(['status', 'in_recommend_pool']);
    table.dropIndex(['quality_score']);
    table.dropColumn('quality_score');
    table.dropColumn('in_recommend_pool');
    table.dropColumn('report_count');
    table.dropColumn('adoption_rate');
  });
}
