import { Knex } from 'knex';
import { db, generateUUID } from '../config/database';
import { ClientPlatform, getFeatureMatrix } from '../config/feature-matrix';

export type BillingProductCode = 'growth_monthly_1990' | 'growth_quarterly_4900' | 'ai_baby_pack_20_990';
export type BillingFeatureCode = 'ai_baby_recipe' | 'weekly_plan_from_prompt' | 'smart_recommendation';

interface ProductQuotaGrant {
  feature_code: BillingFeatureCode;
  total_quota: number;
  reset_mode: 'period' | 'one_off';
  display_name: string;
}

interface ProductDefinition {
  code: BillingProductCode;
  name: string;
  price_fen: number;
  type: 'membership' | 'ai_pack';
  provider: 'wechat_pay';
  duration_days?: number;
  quotas: ProductQuotaGrant[];
  description: string;
}

interface BillingOrderRow {
  id: string;
  user_id: string;
  product_code: BillingProductCode;
  provider: string;
  amount_fen: number;
  currency: string;
  status: string;
  out_trade_no: string;
  provider_transaction_id?: string | null;
  paid_at?: string | null;
  expires_at?: string | null;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface EntitlementRow {
  id: string;
  user_id: string;
  source_order_id?: string | null;
  plan_code: string;
  status: string;
  starts_at: string;
  ends_at?: string | null;
  benefits_snapshot?: any;
}

interface QuotaAccountRow {
  id: string;
  user_id: string;
  source_order_id?: string | null;
  entitlement_id?: string | null;
  feature_code: BillingFeatureCode;
  reset_mode: 'period' | 'one_off';
  total_quota: number;
  used_quota: number;
  status: string;
  period_start?: string | null;
  period_end?: string | null;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

const PRODUCT_CATALOG: ProductDefinition[] = [
  {
    code: 'growth_monthly_1990',
    name: '成长卡月卡',
    price_fen: 1990,
    type: 'membership',
    provider: 'wechat_pay',
    duration_days: 30,
    description: '适合高频家庭使用，包含宝宝版改写、智能周计划与智能推荐额度。',
    quotas: [
      { feature_code: 'ai_baby_recipe', total_quota: 20, reset_mode: 'period', display_name: '宝宝版 AI 改写' },
      { feature_code: 'weekly_plan_from_prompt', total_quota: 8, reset_mode: 'period', display_name: '自然语言周计划' },
      { feature_code: 'smart_recommendation', total_quota: 30, reset_mode: 'period', display_name: '智能推荐' },
    ],
  },
  {
    code: 'growth_quarterly_4900',
    name: '成长卡季卡',
    price_fen: 4900,
    type: 'membership',
    provider: 'wechat_pay',
    duration_days: 90,
    description: '适合连续使用 3 个月的家庭，价格更优。',
    quotas: [
      { feature_code: 'ai_baby_recipe', total_quota: 60, reset_mode: 'period', display_name: '宝宝版 AI 改写' },
      { feature_code: 'weekly_plan_from_prompt', total_quota: 24, reset_mode: 'period', display_name: '自然语言周计划' },
      { feature_code: 'smart_recommendation', total_quota: 90, reset_mode: 'period', display_name: '智能推荐' },
    ],
  },
  {
    code: 'ai_baby_pack_20_990',
    name: '宝宝版 AI 加油包',
    price_fen: 990,
    type: 'ai_pack',
    provider: 'wechat_pay',
    description: '补充宝宝版 AI 改写次数，适合轻度用户按需购买。',
    quotas: [
      { feature_code: 'ai_baby_recipe', total_quota: 20, reset_mode: 'one_off', display_name: '宝宝版 AI 改写' },
    ],
  },
];

function parseJson<T>(value: any, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function addDays(date: Date, days?: number) {
  if (!days) return null;
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export class BillingService {
  getProductCatalog() {
    return PRODUCT_CATALOG.map((product) => ({
      ...product,
      price_yuan: Number((product.price_fen / 100).toFixed(2)),
    }));
  }

  getProduct(productCode: string) {
    return PRODUCT_CATALOG.find((item) => item.code === productCode);
  }

  async createOrder(userId: string, productCode: BillingProductCode) {
    const product = this.getProduct(productCode);
    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const now = new Date();
    const orderId = generateUUID().replace(/-/g, '').slice(0, 32);
    const outTradeNo = `OD${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const [order] = await db('billing_orders')
      .insert({
        id: orderId,
        user_id: userId,
        product_code: product.code,
        provider: product.provider,
        amount_fen: product.price_fen,
        currency: 'CNY',
        status: 'pending',
        out_trade_no: outTradeNo,
        expires_at: addDays(now, 1)?.toISOString() || null,
        metadata: JSON.stringify({
          product_name: product.name,
          product_type: product.type,
        }),
      })
      .returning('*');

    return this.normalizeOrder(order as BillingOrderRow);
  }

  async markOrderPaid(orderId: string, userId?: string | null) {
    return db.transaction(async (trx) => {
      const order = await this.getOrderForUpdate(orderId, trx);
      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }
      if (userId && order.user_id !== userId) {
        throw new Error('ORDER_FORBIDDEN');
      }

      if (order.status !== 'paid') {
        await trx('billing_orders')
          .where({ id: order.id })
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }

      await this.fulfillPaidOrder(order.id, trx);

      const refreshed = await this.getOrderForUpdate(order.id, trx);
      return this.normalizeOrder(refreshed as BillingOrderRow);
    });
  }

  async getOrderById(orderId: string, userId?: string) {
    let query = db('billing_orders').where({ id: orderId });
    if (userId) query = query.andWhere({ user_id: userId });
    const row = await query.first();
    return row ? this.normalizeOrder(row as BillingOrderRow) : null;
  }

  async listUserOrders(userId: string) {
    const rows = await db('billing_orders').where({ user_id: userId }).orderBy('created_at', 'desc').limit(20);
    return rows.map((row) => this.normalizeOrder(row as BillingOrderRow));
  }

  async getUserBillingSummary(userId: string, platform?: ClientPlatform) {
    await this.expireStaleRecords(userId);

    const [entitlements, quotas, orders] = await Promise.all([
      db('user_entitlements').where({ user_id: userId }).orderBy('created_at', 'desc'),
      db('ai_quota_accounts').where({ user_id: userId }).orderBy('created_at', 'desc'),
      this.listUserOrders(userId),
    ]);

    const activeEntitlements = entitlements
      .map((row) => this.normalizeEntitlement(row as EntitlementRow))
      .filter((row) => row.status === 'active');

    const quotaSummaryMap = new Map<string, any>();
    quotas
      .map((row) => this.normalizeQuotaAccount(row as QuotaAccountRow))
      .filter((row) => row.status === 'active')
      .forEach((row) => {
        const key = row.feature_code;
        const existing = quotaSummaryMap.get(key) || {
          feature_code: key,
          total_quota: 0,
          used_quota: 0,
          remaining_quota: 0,
          reset_modes: new Set<string>(),
          accounts: [],
        };

        existing.total_quota += row.total_quota;
        existing.used_quota += row.used_quota;
        existing.remaining_quota += Math.max(row.total_quota - row.used_quota, 0);
        existing.reset_modes.add(row.reset_mode);
        existing.accounts.push(row);
        quotaSummaryMap.set(key, existing);
      });

    const quotaSummary = Array.from(quotaSummaryMap.values()).map((item) => ({
      ...item,
      reset_modes: Array.from(item.reset_modes),
    }));

    return {
      products: this.getProductCatalog(),
      feature_matrix: getFeatureMatrix(platform),
      active_entitlements: activeEntitlements,
      quota_summary: quotaSummary,
      recent_orders: orders,
    };
  }

  async getFeatureQuotaStatus(userId: string, featureCode: BillingFeatureCode) {
    await this.expireStaleRecords(userId);
    const rows = await db('ai_quota_accounts')
      .where({ user_id: userId, feature_code: featureCode, status: 'active' })
      .orderBy('created_at', 'asc');

    const normalized = rows.map((row) => this.normalizeQuotaAccount(row as QuotaAccountRow));
    const availableAccount = normalized.find((item) => item.remaining_quota > 0);

    return {
      available: Boolean(availableAccount),
      remaining_quota: availableAccount?.remaining_quota || 0,
      account: availableAccount || null,
    };
  }

  async consumeFeatureQuota(input: {
    userId: string;
    featureCode: BillingFeatureCode;
    modelCode?: string;
    estimatedCostUsd?: number;
    inputTokens?: number;
    outputTokens?: number;
    requestId?: string;
    metadata?: Record<string, any>;
  }) {
    return db.transaction(async (trx) => {
      await this.expireStaleRecords(input.userId, trx);
      const rows = await trx('ai_quota_accounts')
        .where({ user_id: input.userId, feature_code: input.featureCode, status: 'active' })
        .orderBy('created_at', 'asc');

      const accounts = rows.map((row) => this.normalizeQuotaAccount(row as QuotaAccountRow));
      const target = accounts.find((item) => item.remaining_quota > 0);

      if (!target) {
        await this.insertUsageLog({
          userId: input.userId,
          featureCode: input.featureCode,
          modelCode: input.modelCode,
          success: false,
          billingMode: 'quota',
          estimatedCostUsd: input.estimatedCostUsd,
          inputTokens: input.inputTokens,
          outputTokens: input.outputTokens,
          requestId: input.requestId,
          metadata: input.metadata,
        }, trx);

        return { allowed: false, remaining_quota: 0 };
      }

      const nextUsed = target.used_quota + 1;
      await trx('ai_quota_accounts')
        .where({ id: target.id })
        .update({
          used_quota: nextUsed,
          updated_at: new Date().toISOString(),
          status: nextUsed >= target.total_quota ? 'exhausted' : target.status,
        });

      await this.insertUsageLog({
        userId: input.userId,
        featureCode: input.featureCode,
        quotaAccountId: target.id,
        sourceOrderId: target.source_order_id || undefined,
        modelCode: input.modelCode,
        success: true,
        billingMode: 'quota',
        estimatedCostUsd: input.estimatedCostUsd,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        requestId: input.requestId,
        metadata: input.metadata,
      }, trx);

      return {
        allowed: true,
        quota_account_id: target.id,
        remaining_quota: Math.max(target.total_quota - nextUsed, 0),
      };
    });
  }

  async devGrantProduct(userId: string, productCode: BillingProductCode) {
    const order = await this.createOrder(userId, productCode);
    const paidOrder = await this.markOrderPaid(order.id, userId);
    const summary = await this.getUserBillingSummary(userId);

    return {
      order: paidOrder,
      summary,
    };
  }

  async devResetQuotaUsage(userId: string, featureCodes?: BillingFeatureCode[]) {
    await this.expireStaleRecords(userId);

    const now = new Date().toISOString();
    let query = db('ai_quota_accounts')
      .where({ user_id: userId })
      .whereIn('status', ['active', 'exhausted']);

    if (featureCodes?.length) {
      query = query.whereIn('feature_code', featureCodes);
    }

    await query.update({
      used_quota: 0,
      status: 'active',
      updated_at: now,
    });

    return this.getUserBillingSummary(userId);
  }

  async devClearBenefits(userId: string) {
    const now = new Date().toISOString();

    await db.transaction(async (trx) => {
      await trx('user_entitlements')
        .where({ user_id: userId })
        .whereIn('status', ['active', 'expired'])
        .update({
          status: 'expired',
          ends_at: now,
          updated_at: now,
        });

      await trx('ai_quota_accounts')
        .where({ user_id: userId })
        .whereIn('status', ['active', 'exhausted', 'expired'])
        .update({
          status: 'expired',
          used_quota: db.ref('total_quota'),
          period_end: now,
          updated_at: now,
        });
    });

    return this.getUserBillingSummary(userId);
  }

  private async fulfillPaidOrder(orderId: string, trx: Knex.Transaction) {
    const order = await this.getOrderForUpdate(orderId, trx);
    if (!order) throw new Error('ORDER_NOT_FOUND');

    const product = this.getProduct(order.product_code);
    if (!product) throw new Error('PRODUCT_NOT_FOUND');

    const existingEntitlement = await trx('user_entitlements').where({ source_order_id: order.id }).first();
    const existingQuota = await trx('ai_quota_accounts').where({ source_order_id: order.id }).first();
    if (existingEntitlement || existingQuota) {
      return;
    }

    const now = order.paid_at ? new Date(order.paid_at) : new Date();
    const endsAt = addDays(now, product.duration_days);
    let entitlementId: string | null = null;

    if (product.type === 'membership') {
      entitlementId = generateUUID().replace(/-/g, '').slice(0, 32);
      await trx('user_entitlements').insert({
        id: entitlementId,
        user_id: order.user_id,
        source_order_id: order.id,
        plan_code: product.code,
        status: 'active',
        starts_at: now.toISOString(),
        ends_at: endsAt?.toISOString() || null,
        benefits_snapshot: JSON.stringify({
          product_name: product.name,
          quotas: product.quotas,
          description: product.description,
        }),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
    }

    for (const quota of product.quotas) {
      await trx('ai_quota_accounts').insert({
        id: generateUUID().replace(/-/g, '').slice(0, 32),
        user_id: order.user_id,
        source_order_id: order.id,
        entitlement_id: entitlementId,
        feature_code: quota.feature_code,
        reset_mode: quota.reset_mode,
        total_quota: quota.total_quota,
        used_quota: 0,
        status: 'active',
        period_start: now.toISOString(),
        period_end: quota.reset_mode === 'period' ? (endsAt?.toISOString() || null) : null,
        metadata: JSON.stringify({
          display_name: quota.display_name,
          product_code: product.code,
          product_name: product.name,
        }),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
    }
  }

  private async expireStaleRecords(userId: string, trx?: Knex.Transaction) {
    const client = trx || db;
    const now = new Date().toISOString();

    await client('user_entitlements')
      .where({ user_id: userId, status: 'active' })
      .whereNotNull('ends_at')
      .andWhere('ends_at', '<', now)
      .update({ status: 'expired', updated_at: now });

    await client('ai_quota_accounts')
      .where({ user_id: userId, status: 'active' })
      .whereNotNull('period_end')
      .andWhere('period_end', '<', now)
      .update({ status: 'expired', updated_at: now });

    await client('ai_quota_accounts')
      .where({ user_id: userId, status: 'active' })
      .andWhere('used_quota', '>=', client.ref('total_quota'))
      .update({ status: 'exhausted', updated_at: now });
  }

  private async insertUsageLog(input: {
    userId: string;
    featureCode: BillingFeatureCode;
    quotaAccountId?: string;
    sourceOrderId?: string;
    modelCode?: string;
    billingMode: 'quota';
    success: boolean;
    estimatedCostUsd?: number;
    inputTokens?: number;
    outputTokens?: number;
    requestId?: string;
    metadata?: Record<string, any>;
  }, trx: Knex.Transaction) {
    await trx('ai_usage_logs').insert({
      id: generateUUID().replace(/-/g, '').slice(0, 32),
      user_id: input.userId,
      quota_account_id: input.quotaAccountId || null,
      source_order_id: input.sourceOrderId || null,
      feature_code: input.featureCode,
      model_code: input.modelCode || null,
      billing_mode: input.billingMode,
      input_tokens: input.inputTokens || null,
      output_tokens: input.outputTokens || null,
      estimated_cost_usd: input.estimatedCostUsd ?? null,
      success: input.success,
      request_id: input.requestId || null,
      metadata: JSON.stringify(input.metadata || {}),
      created_at: new Date().toISOString(),
    });
  }

  private async getOrderForUpdate(orderId: string, trx: Knex.Transaction) {
    return trx('billing_orders').where({ id: orderId }).first();
  }

  private normalizeOrder(row: BillingOrderRow) {
    return {
      ...row,
      metadata: parseJson(row.metadata, {}),
      amount_yuan: Number((row.amount_fen / 100).toFixed(2)),
    };
  }

  private normalizeEntitlement(row: EntitlementRow) {
    const now = new Date();
    const endsAt = row.ends_at ? new Date(row.ends_at) : null;
    return {
      ...row,
      benefits_snapshot: parseJson(row.benefits_snapshot, {}),
      is_active: row.status === 'active' && (!endsAt || endsAt >= now),
    };
  }

  private normalizeQuotaAccount(row: QuotaAccountRow) {
    const periodEnd = row.period_end ? new Date(row.period_end) : null;
    const now = new Date();
    const remaining = Math.max(Number(row.total_quota || 0) - Number(row.used_quota || 0), 0);

    return {
      ...row,
      metadata: parseJson(row.metadata, {}),
      remaining_quota: remaining,
      is_active: row.status === 'active' && (!periodEnd || periodEnd >= now) && remaining > 0,
    };
  }
}

export const billingService = new BillingService();
