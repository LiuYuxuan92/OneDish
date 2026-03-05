import { Knex } from 'knex';

/**
 * 添加校准难度字段到 recipes 表
 * 用于存储根据用户完成率自动校准后的难度标签
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('recipes', (table) => {
    // 校准后的难度：使用校准值替代原始 difficulty
    // 如果为 null，表示尚未完成校准
    table.string('calibrated_difficulty', 20).nullable();
    
    // 统计字段：用于记录完成次数和完成率
    table.integer('completion_count').defaultTo(0);
    table.decimal('completion_rate', 5, 4).nullable();
    
    // 最后校准时间
    table.datetime('last_calibrated_at').nullable();
  });

  // 添加索引以加速校准查询
  await knex.schema.alterTable('recipes', (table) => {
    table.index('calibrated_difficulty');
    table.index('completion_count');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('recipes', (table) => {
    table.dropColumn('calibrated_difficulty');
    table.dropColumn('completion_count');
    table.dropColumn('completion_rate');
    table.dropColumn('last_calibrated_at');
  });
}
