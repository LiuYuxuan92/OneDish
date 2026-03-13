import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasBillingOrders = await knex.schema.hasTable('billing_orders');
  if (!hasBillingOrders) {
    await knex.schema.createTable('billing_orders', (table) => {
      table.string('id', 32).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
      table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('product_code', 64).notNullable();
      table.string('provider', 32).notNullable().defaultTo('wechat_pay');
      table.integer('amount_fen').notNullable();
      table.string('currency', 8).notNullable().defaultTo('CNY');
      table.string('status', 16).notNullable().defaultTo('pending');
      table.string('out_trade_no', 64).notNullable().unique();
      table.string('provider_transaction_id', 128).nullable();
      table.timestamp('paid_at').nullable();
      table.timestamp('expires_at').nullable();
      table.json('metadata').defaultTo('{}');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['user_id'], 'billing_orders_user_id_index');
      table.index(['status'], 'billing_orders_status_index');
      table.index(['product_code'], 'billing_orders_product_code_index');
    });
  }

  const hasEntitlements = await knex.schema.hasTable('user_entitlements');
  if (!hasEntitlements) {
    await knex.schema.createTable('user_entitlements', (table) => {
      table.string('id', 32).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
      table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('source_order_id', 32).nullable().references('id').inTable('billing_orders').onDelete('SET NULL');
      table.string('plan_code', 64).notNullable();
      table.string('status', 16).notNullable().defaultTo('active');
      table.timestamp('starts_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('ends_at').nullable();
      table.json('benefits_snapshot').defaultTo('{}');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['user_id'], 'user_entitlements_user_id_index');
      table.index(['status'], 'user_entitlements_status_index');
      table.index(['source_order_id'], 'user_entitlements_source_order_id_index');
    });
  }

  const hasQuotaAccounts = await knex.schema.hasTable('ai_quota_accounts');
  if (!hasQuotaAccounts) {
    await knex.schema.createTable('ai_quota_accounts', (table) => {
      table.string('id', 32).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
      table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('source_order_id', 32).nullable().references('id').inTable('billing_orders').onDelete('SET NULL');
      table.string('entitlement_id', 32).nullable().references('id').inTable('user_entitlements').onDelete('SET NULL');
      table.string('feature_code', 64).notNullable();
      table.string('reset_mode', 16).notNullable().defaultTo('one_off');
      table.integer('total_quota').notNullable();
      table.integer('used_quota').notNullable().defaultTo(0);
      table.string('status', 16).notNullable().defaultTo('active');
      table.timestamp('period_start').nullable();
      table.timestamp('period_end').nullable();
      table.json('metadata').defaultTo('{}');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['user_id', 'feature_code'], 'ai_quota_accounts_user_feature_index');
      table.index(['status'], 'ai_quota_accounts_status_index');
      table.index(['source_order_id'], 'ai_quota_accounts_source_order_id_index');
    });
  }

  const hasUsageLogs = await knex.schema.hasTable('ai_usage_logs');
  if (!hasUsageLogs) {
    await knex.schema.createTable('ai_usage_logs', (table) => {
      table.string('id', 32).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
      table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('quota_account_id', 32).nullable().references('id').inTable('ai_quota_accounts').onDelete('SET NULL');
      table.string('source_order_id', 32).nullable().references('id').inTable('billing_orders').onDelete('SET NULL');
      table.string('feature_code', 64).notNullable();
      table.string('model_code', 128).nullable();
      table.string('billing_mode', 16).notNullable().defaultTo('quota');
      table.integer('input_tokens').nullable();
      table.integer('output_tokens').nullable();
      table.decimal('estimated_cost_usd', 10, 6).nullable();
      table.boolean('success').notNullable().defaultTo(true);
      table.string('request_id', 64).nullable();
      table.json('metadata').defaultTo('{}');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['user_id', 'feature_code'], 'ai_usage_logs_user_feature_index');
      table.index(['created_at'], 'ai_usage_logs_created_at_index');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('ai_usage_logs')) {
    await knex.schema.dropTable('ai_usage_logs');
  }

  if (await knex.schema.hasTable('ai_quota_accounts')) {
    await knex.schema.dropTable('ai_quota_accounts');
  }

  if (await knex.schema.hasTable('user_entitlements')) {
    await knex.schema.dropTable('user_entitlements');
  }

  if (await knex.schema.hasTable('billing_orders')) {
    await knex.schema.dropTable('billing_orders');
  }
}
