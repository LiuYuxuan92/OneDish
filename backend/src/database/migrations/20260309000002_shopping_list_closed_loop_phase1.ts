import type { Knex } from 'knex';

/**
 * 购物清单闭环设计 Phase 1 - 数据库迁移
 * 添加必要的字段支持乐观锁、状态管理和反馈事件
 */
export async function up(knex: Knex): Promise<void> {
  // 1. shopping_lists 表新增字段
  const hasVersion = await knex.schema.hasColumn('shopping_lists', 'version');
  if (!hasVersion) {
    await knex.schema.alterTable('shopping_lists', (table) => {
      table.integer('version').notNullable().defaultTo(1);
    });
  }

  const hasStatus = await knex.schema.hasColumn('shopping_lists', 'status');
  if (!hasStatus) {
    await knex.schema.alterTable('shopping_lists', (table) => {
      table.enum('status', ['open', 'in_progress', 'completed', 'archived']).notNullable().defaultTo('open');
    });
  }

  const hasCompletedAt = await knex.schema.hasColumn('shopping_lists', 'completed_at');
  if (!hasCompletedAt) {
    await knex.schema.alterTable('shopping_lists', (table) => {
      table.datetime('completed_at').nullable();
    });
  }

  const hasCompletedBy = await knex.schema.hasColumn('shopping_lists', 'completed_by');
  if (!hasCompletedBy) {
    await knex.schema.alterTable('shopping_lists', (table) => {
      table.string('completed_by', 36).nullable();
    });
  }

  const hasSourceType = await knex.schema.hasColumn('shopping_lists', 'source_type');
  if (!hasSourceType) {
    await knex.schema.alterTable('shopping_lists', (table) => {
      table.enum('source_type', ['meal_plan', 'recommendation_bundle', 'manual']).nullable();
    });
  }

  const hasSourceRefs = await knex.schema.hasColumn('shopping_lists', 'source_refs');
  if (!hasSourceRefs) {
    await knex.schema.alterTable('shopping_lists', (table) => {
      table.json('source_refs').nullable();
    });
  }

  // 2. 创建 shopping_feedback_events 表
  const hasFeedbackTable = await knex.schema.hasTable('shopping_feedback_events');
  if (!hasFeedbackTable) {
    await knex.schema.createTable('shopping_feedback_events', (table) => {
      table.string('id', 36).primary().defaultTo(knex.raw("lower(hex(randomblob(16)))"));
      table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('family_id', 36).nullable().references('id').inTable('families').onDelete('SET NULL');
      table.string('list_id', 36).notNullable().references('id').inTable('shopping_lists').onDelete('CASCADE');
      table.string('item_id', 36).notNullable();
      
      table.string('event_type', 50).notNullable(); // 'purchase' | 'out_of_stock' | 'substitute' | 'skip' | 'reopen'
      table.string('ingredient_key', 100).notNullable();
      table.string('substitute_key', 100).nullable();
      table.string('substitute_name', 100).nullable();
      table.string('reason', 50).nullable();
      
      table.string('actor_user_id', 36).notNullable();
      
      table.string('source_meal_plan_id', 36).nullable();
      table.json('source_recipe_ids').nullable();
      
      table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
      
      // 索引
      table.index(['user_id', 'family_id'], 'idx_feedback_user_family');
      table.index(['ingredient_key'], 'idx_feedback_ingredient');
      table.index(['created_at'], 'idx_feedback_created');
      table.index(['list_id', 'item_id'], 'idx_feedback_list_item');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // 删除 shopping_feedback_events 表
  const hasFeedbackTable = await knex.schema.hasTable('shopping_feedback_events');
  if (hasFeedbackTable) {
    await knex.schema.dropTableIfExists('shopping_feedback_events');
  }

  // 删除 shopping_lists 字段
  const hasSourceRefs = await knex.schema.hasColumn('shopping_lists', 'source_refs');
  if (hasSourceRefs) {
    await knex.schema.alterTable('shopping_lists', (table) => {
      table.dropColumn('source_refs');
    });
  }

  const hasSourceType = await knex.schema.hasColumn('shopping_lists', 'source_type');
  if (hasSourceType) {
    await knex.schema.alterTable('shopping_lists', (table) => {
      table.dropColumn('source_type');
    });
  }

  const hasCompletedBy = await knex.schema.hasColumn('shopping_lists', 'completed_by');
  if (hasCompletedBy) {
    await knex.schema.alterTable('shopping_lists', (table) => {
      table.dropColumn('completed_by');
    });
  }

  const hasCompletedAt = await knex.schema.hasColumn('shopping_lists', 'completed_at');
  if (hasCompletedAt) {
    await knex.schema.alterTable('shopping_lists', (table) => {
      table.dropColumn('completed_at');
    });
  }

  const hasStatus = await knex.schema.hasColumn('shopping_lists', 'status');
  if (hasStatus) {
    await knex.schema.alterTable('shopping_lists', (table) => {
      table.dropColumn('status');
    });
  }

  const hasVersion = await knex.schema.hasColumn('shopping_lists', 'version');
  if (hasVersion) {
    await knex.schema.alterTable('shopping_lists', (table) => {
      table.dropColumn('version');
    });
  }
}
