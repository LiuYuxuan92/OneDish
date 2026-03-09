import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('account_merge_jobs');
  if (hasTable) return;

  await knex.schema.createTable('account_merge_jobs', (table) => {
    table.string('id', 64).primary();
    table.string('source_guest_id', 64).notNullable();
    table.string('target_user_id', 64).notNullable();
    table.string('status', 16).notNullable().defaultTo('pending');
    // pending: 待处理, running: 执行中, succeeded: 成功, failed: 失败, rolled_back: 已回滚
    table.string('idempotency_key', 64).notNullable().unique();
    table.jsonb('conflict_policy').defaultTo('{}');
    table.timestamp('started_at').nullable();
    table.timestamp('finished_at').nullable();
    table.string('error_code', 32).nullable();
    table.text('error_message').nullable();
    table.jsonb('result_summary').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['source_guest_id'], 'account_merge_jobs_source_guest_id_index');
    table.index(['target_user_id'], 'account_merge_jobs_target_user_id_index');
    table.index(['status'], 'account_merge_jobs_status_index');
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('account_merge_jobs');
  if (!hasTable) return;

  await knex.schema.dropTable('account_merge_jobs');
}
