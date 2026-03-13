export type ClientPlatform = 'miniprogram' | 'app' | 'web';
export type AccessPolicy = 'free' | 'member' | 'member_quota';
export type PlatformExperience = 'full' | 'lite' | 'upsell' | 'hidden';

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

const FEATURE_MATRIX: FeatureMatrixItem[] = [
  {
    feature_code: 'ai_baby_recipe',
    display_name: '宝宝版 AI 改写',
    description: '把成人菜快速改成适合宝宝月龄的做法与步骤。',
    category: 'core_ai',
    access_policy: 'member_quota',
    quota_feature_code: 'ai_baby_recipe',
    supported_platforms: ['miniprogram', 'app'],
    platform_experience: { miniprogram: 'full', app: 'full' },
  },
  {
    feature_code: 'weekly_plan_from_prompt',
    display_name: '自然语言周计划',
    description: '输入家庭需求，自动生成一周辅食计划。',
    category: 'core_ai',
    access_policy: 'member_quota',
    quota_feature_code: 'weekly_plan_from_prompt',
    supported_platforms: ['miniprogram', 'app'],
    platform_experience: { miniprogram: 'lite', app: 'full' },
    upsell_copy: 'App 内可继续编辑、复用模板和做更完整管理。',
  },
  {
    feature_code: 'smart_recommendation',
    display_name: '智能推荐 / 换菜',
    description: '根据月龄、偏好和时间条件给出更贴合的菜谱建议。',
    category: 'core_ai',
    access_policy: 'member_quota',
    quota_feature_code: 'smart_recommendation',
    supported_platforms: ['miniprogram', 'app'],
    platform_experience: { miniprogram: 'full', app: 'full' },
  },
  {
    feature_code: 'preference_sync',
    display_name: '偏好同步',
    description: '月龄、偏好食材、排除食材和烹饪时长偏好跨端同步。',
    category: 'sync',
    access_policy: 'member',
    supported_platforms: ['miniprogram', 'app'],
    platform_experience: { miniprogram: 'full', app: 'full' },
  },
  {
    feature_code: 'history_sync',
    display_name: '历史记录同步',
    description: '计划、收藏、AI 结果与使用记录在小程序和 App 保持一致。',
    category: 'sync',
    access_policy: 'member',
    supported_platforms: ['miniprogram', 'app'],
    platform_experience: { miniprogram: 'full', app: 'full' },
  },
  {
    feature_code: 'inventory_advanced',
    display_name: '高级库存管理',
    description: '库存录入、缺口判断、到期提醒等深度功能。',
    category: 'inventory',
    access_policy: 'member',
    supported_platforms: ['app'],
    platform_experience: { miniprogram: 'upsell', app: 'full' },
    app_only_value: true,
    upsell_copy: '该能力需在 App 中体验，适合长期管理家庭库存。',
  },
  {
    feature_code: 'weekly_review',
    display_name: '喂养周复盘',
    description: '汇总反馈、趋势与建议，帮助持续优化一周饮食安排。',
    category: 'insight',
    access_policy: 'member',
    supported_platforms: ['app'],
    platform_experience: { miniprogram: 'upsell', app: 'full' },
    app_only_value: true,
    upsell_copy: '可在 App 查看完整周复盘、趋势与建议。',
  },
  {
    feature_code: 'family_collab',
    display_name: '家庭协作',
    description: '家庭成员共享计划、清单与反馈，适合多人协同。',
    category: 'family',
    access_policy: 'member',
    supported_platforms: ['app'],
    platform_experience: { miniprogram: 'upsell', app: 'full' },
    app_only_value: true,
    upsell_copy: '家庭协作面板与权限管理仅在 App 完整开放。',
  },
  {
    feature_code: 'cooking_mode',
    display_name: '烹饪模式',
    description: '跟做步骤、计时和沉浸式做饭流程。',
    category: 'cooking',
    access_policy: 'member',
    supported_platforms: ['app'],
    platform_experience: { miniprogram: 'upsell', app: 'full' },
    app_only_value: true,
    upsell_copy: '跟做计时和连续操作更适合在 App 中完成。',
  },
];

export function getFeatureMatrix(platform?: ClientPlatform): FeatureMatrixItem[] {
  if (!platform) {
    return FEATURE_MATRIX.map((item) => ({ ...item }));
  }

  return FEATURE_MATRIX
    .filter((item) => item.supported_platforms.includes(platform) || item.platform_experience[platform] === 'upsell')
    .map((item) => ({
      ...item,
      supported_platforms: [...item.supported_platforms],
      platform_experience: { ...item.platform_experience },
    }));
}

export function getFeatureCodesByAccessPolicy(accessPolicy: AccessPolicy): string[] {
  return FEATURE_MATRIX.filter((item) => item.access_policy === accessPolicy).map((item) => item.feature_code);
}

