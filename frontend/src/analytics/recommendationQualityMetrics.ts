export const RECOMMEND_QUALITY_DASHBOARD_METRICS = {
  avg_quality_score: {
    event: 'recommend_quality_scored',
    field: 'qualityScore',
    aggregation: 'avg',
    description: '推荐质量综合分均值',
  },
  swap_success_rate: {
    event: 'recommend_swap_click',
    field: 'nextRecipeId',
    aggregation: 'ratio_non_null',
    description: '换菜成功率（有 nextRecipeId 记为成功）',
  },
  timeFit_avg: {
    event: 'recommend_quality_scored',
    field: 'timeFit',
    aggregation: 'avg',
    description: '时长匹配分均值',
  },
  nutritionFit_avg: {
    event: 'recommend_quality_scored',
    field: 'nutritionFit',
    aggregation: 'avg',
    description: '营养匹配分均值',
  },
  preferenceFit_avg: {
    event: 'recommend_quality_scored',
    field: 'preferenceFit',
    aggregation: 'avg',
    description: '偏好匹配分均值',
  },
  stageFit_avg: {
    event: 'recommend_quality_scored',
    field: 'stageFit',
    aggregation: 'avg',
    description: '阶段匹配分均值',
  },
} as const;

export const RECOMMEND_QUALITY_REQUIRED_DIMENSIONS = [
  'experimentBucket',
  'swapConfigSource',
  'recommendationSource',
  'qualityScore',
  'scoreBreakdown',
  'timeFit',
  'nutritionFit',
  'preferenceFit',
  'stageFit',
] as const;
