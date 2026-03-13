import { apiClient } from './client';

export type ClientPlatform = 'miniprogram' | 'app' | 'web';
export type AccessPolicy = 'free' | 'member' | 'member_quota';
export type PlatformExperience = 'full' | 'lite' | 'upsell' | 'hidden';
export type BillingProductCode = 'growth_monthly_1990' | 'growth_quarterly_4900' | 'ai_baby_pack_20_990';

export interface BillingProduct {
  code: string;
  name: string;
  price_fen: number;
  price_yuan: number;
  type: 'membership' | 'ai_pack';
  provider: 'wechat_pay';
  duration_days?: number;
  description: string;
  quotas: Array<{
    feature_code: string;
    total_quota: number;
    reset_mode: 'period' | 'one_off';
    display_name: string;
  }>;
}

export interface FeatureMatrixItem {
  feature_code: string;
  display_name: string;
  description: string;
  category: 'core_ai' | 'sync' | 'family' | 'inventory' | 'cooking' | 'insight';
  access_policy: AccessPolicy;
  quota_feature_code?: string;
  supported_platforms: ClientPlatform[];
  platform_experience: Partial<Record<ClientPlatform, PlatformExperience>>;
  app_only_value?: boolean;
  upsell_copy?: string;
}

export interface BillingQuotaSummary {
  feature_code: string;
  total_quota: number;
  used_quota: number;
  remaining_quota: number;
  reset_modes: string[];
}

export interface BillingEntitlement {
  id: string;
  plan_code: string;
  status: string;
  starts_at: string;
  ends_at?: string | null;
  is_active: boolean;
  benefits_snapshot?: Record<string, any>;
}

export interface BillingOrderSummary {
  id: string;
  product_code: string;
  status: string;
  amount_yuan: number;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface BillingSummary {
  products: BillingProduct[];
  feature_matrix: FeatureMatrixItem[];
  active_entitlements: BillingEntitlement[];
  quota_summary: BillingQuotaSummary[];
  recent_orders: BillingOrderSummary[];
}

export interface BillingDevGrantResult {
  order: BillingOrderSummary;
  summary: BillingSummary;
}

export const billingApi = {
  getProducts: () => apiClient.get<BillingProduct[]>('/billing/products'),
  getFeatureMatrix: (platform: ClientPlatform = 'app') => apiClient.get<FeatureMatrixItem[]>('/billing/feature-matrix', { params: { platform } }),
  getSummary: (platform: ClientPlatform = 'app') => apiClient.get<BillingSummary>('/billing/me/summary', { params: { platform } }),
  devGrantProduct: (productCode: BillingProductCode) => apiClient.post<BillingDevGrantResult>('/billing/dev/grant-product', { product_code: productCode }),
  devResetQuotas: (featureCodes?: string[]) => apiClient.post<BillingSummary>('/billing/dev/reset-quotas', { feature_codes: featureCodes }),
  devClearBenefits: () => apiClient.post<BillingSummary>('/billing/dev/clear-benefits'),
};
