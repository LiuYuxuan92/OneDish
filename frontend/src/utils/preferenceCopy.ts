export interface PreferenceCopyReason {
  code?: string;
  label?: string;
  detail?: string;
  contribution?: number;
}

export interface PreferenceSummaryInput {
  defaultBabyAge?: number | null;
  preferIngredients?: string[];
  excludeIngredients?: string[];
  cookingTimeLimit?: number | null;
  difficultyPreference?: string | null;
}

const uniq = (list: Array<string | undefined | null>) => Array.from(new Set(list.map((item) => String(item || '').trim()).filter(Boolean)));

const normalizeDifficulty = (value?: string | null) => {
  if (!value) return '';
  if (value === 'easy') return '简单';
  if (value === 'medium') return '中等';
  if (value === 'hard') return '省心';
  return value;
};

export const buildPreferenceSummaryLine = (summary?: PreferenceSummaryInput | null) => {
  if (!summary) return '';
  const parts: string[] = [];
  if (summary.defaultBabyAge) parts.push(`${summary.defaultBabyAge}个月月龄`);
  if (summary.cookingTimeLimit) parts.push(`${summary.cookingTimeLimit}分钟内优先`);
  if (summary.preferIngredients?.length) parts.push(`偏爱${summary.preferIngredients.slice(0, 2).join('、')}`);
  if (summary.excludeIngredients?.length) parts.push(`避开${summary.excludeIngredients.slice(0, 2).join('、')}`);
  if (summary.difficultyPreference) parts.push(`${normalizeDifficulty(summary.difficultyPreference)}难度优先`);
  return parts.slice(0, 3).join(' · ');
};

export const buildPreferenceLeadText = (summary?: PreferenceSummaryInput | null) => {
  const line = buildPreferenceSummaryLine(summary);
  return line ? `这份结果已按你的口味与做饭习惯优先排序：${line}` : '这份结果已按你的口味、做饭时长和宝宝阶段做了优先排序';
};

export const buildProductizedReasonText = (params: {
  backendExplain?: string[];
  backendReasons?: PreferenceCopyReason[];
  preferenceSummary?: PreferenceSummaryInput | null;
  maxItems?: number;
}) => {
  const { backendExplain = [], backendReasons = [], preferenceSummary, maxItems = 2 } = params;
  const curated: string[] = [];

  const reasonMap = new Map<string, string>();
  backendReasons.forEach((reason) => {
    const code = String(reason?.code || '').trim();
    const detail = String(reason?.detail || '').trim();
    const label = String(reason?.label || '').trim();
    if (!code) return;

    if (code === 'time') {
      reasonMap.set(code, detail ? `更贴合你这次的下厨节奏（${detail}）` : '更贴合你这次的下厨节奏');
    } else if (code === 'baby') {
      reasonMap.set(code, detail ? `更照顾当前宝宝阶段（${detail}）` : '更照顾当前宝宝阶段');
    } else if (code === 'preference') {
      reasonMap.set(code, detail ? `更接近你平时爱买爱做的食材（${detail}）` : '更接近你平时的口味偏好');
    } else if (code === 'difficulty') {
      reasonMap.set(code, detail ? `操作复杂度更符合你的习惯（${detail}）` : '操作复杂度更符合你的习惯');
    } else if (code === 'inventory') {
      reasonMap.set(code, detail ? `和家里现有食材更合拍（${detail}）` : '和家里现有食材更合拍');
    }
  });

  ['time', 'baby', 'preference', 'difficulty', 'inventory'].forEach((key) => {
    const text = reasonMap.get(key);
    if (text) curated.push(text);
  });

  backendExplain.filter(Boolean).forEach((item) => {
    const text = String(item).trim();
    if (!text) return;
    curated.push(text.replace(/^命中/, '更贴合').replace(/^已过滤/, '已帮你避开'));
  });

  if (!curated.length && preferenceSummary) {
    const fallback = buildPreferenceSummaryLine(preferenceSummary);
    if (fallback) curated.push(`已结合你的偏好设置：${fallback}`);
  }

  return uniq(curated).slice(0, maxItems);
};

export const buildSearchPreferenceHint = (params: {
  recipe?: any;
  preferenceSummary?: PreferenceSummaryInput | null;
}) => {
  const { recipe, preferenceSummary } = params;
  const rankingReasons = Array.isArray(recipe?.ranking_reasons) ? recipe.ranking_reasons : [];
  const explain = Array.isArray(recipe?.recommendation_explain) ? recipe.recommendation_explain : [];
  const productized = buildProductizedReasonText({ backendExplain: explain, backendReasons: rankingReasons, preferenceSummary, maxItems: 1 })[0];
  if (productized) return productized;
  return buildPreferenceLeadText(preferenceSummary);
};
