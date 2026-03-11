import { buildPreferenceLeadText, buildSearchPreferenceHint, type PreferenceSummaryInput } from '../utils/preferenceCopy';
import type { SearchPreferenceSource, SearchResultCardViewModel, SearchResultSource } from '../viewmodels/uiMigration';
import { mapRecommendationToCardViewModel } from './recipeDisplayMapper';

const SOURCE_LABELS: Record<string, string> = {
  local: '📚 本地',
  tianxing: '🌐 联网',
  ai: '🤖 AI',
};

const ROUTE_SOURCE_LABELS: Record<string, string> = {
  local: '📚 Local',
  cache: '⚡ Cache',
  web: '🌐 Web',
  tianxing: '🌐 Web',
  ai: '🤖 AI',
};

function normalizeIngredientList(value?: string[] | string | null): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(/[,，、]/).map((token) => token.trim()).filter(Boolean);
  }
  return [];
}

function buildRecommendationText(item: SearchResultSource): string {
  return [
    ...(item.recommendation_explain || []),
    ...((item.ranking_reasons || []).map((reason) => reason.label || reason.detail || '').filter(Boolean)),
  ].join(' · ');
}

function buildSearchLabels(item: SearchResultSource, lovedRecipeNames: Set<string>, rejectedRecipeNames: Set<string>): string[] {
  const labels: string[] = [];
  const lowerName = (item.name || '').toLowerCase();
  const recommendationText = buildRecommendationText(item);

  const dualLike = !!item.baby_version || lowerName.includes('宝宝') || recommendationText.includes('一菜两吃');
  if (dualLike) labels.push('一菜两吃');
  if ((item.prep_time || 0) > 0 && (item.prep_time || 0) <= 20) labels.push('快手');
  if (item.source === 'local') labels.push('本地可深挖');
  if (item.source && item.source !== 'local') labels.push('可先收藏/后补全');
  if (lovedRecipeNames.has(item.name)) labels.push('宝宝接受过');
  if (rejectedRecipeNames.has(item.name)) labels.push('曾经拒绝');

  return labels;
}

export function normalizeSearchPreferenceSummary(source?: SearchPreferenceSource | null): PreferenceSummaryInput | null {
  if (!source) return null;
  return {
    defaultBabyAge: source.defaultBabyAge,
    preferIngredients: normalizeIngredientList(source.preferIngredients),
    excludeIngredients: Array.isArray(source.excludeIngredients)
      ? source.excludeIngredients.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    cookingTimeLimit: source.cookingTimeLimit,
    difficultyPreference: source.difficultyPreference,
  };
}

export function getSearchResultKey(item: Pick<SearchResultSource, 'id' | 'source'>): string {
  return `${item.source || 'local'}:${item.id}`;
}

export function mapSearchResultToCardViewModel(params: {
  item: SearchResultSource;
  lovedRecipeNames: Set<string>;
  rejectedRecipeNames: Set<string>;
  preferenceSummary?: SearchPreferenceSource | null;
}): SearchResultCardViewModel {
  const { item, lovedRecipeNames, rejectedRecipeNames, preferenceSummary } = params;
  const normalizedPreferenceSummary = normalizeSearchPreferenceSummary(preferenceSummary);
  const recommendationText = buildRecommendationText(item);
  const labels = buildSearchLabels(item, lovedRecipeNames, rejectedRecipeNames);

  return {
    id: getSearchResultKey(item),
    resultKey: getSearchResultKey(item),
    recommendation: mapRecommendationToCardViewModel({ ...item, prep_time: item.prep_time ?? 0 }, {
      recommendationReason: recommendationText || undefined,
      recommendationTags: labels,
    }),
    sourceLabel: SOURCE_LABELS[item.source || 'local'] || SOURCE_LABELS.local,
    description: item.description,
    preferenceHint: buildSearchPreferenceHint({
      recipe: item,
      preferenceSummary: normalizedPreferenceSummary,
    }),
  };
}

export function buildSearchResultSummary(params: {
  total: number;
  routeSource?: string;
  preferenceSummary?: SearchPreferenceSource | null;
}) {
  const normalizedPreferenceSummary = normalizeSearchPreferenceSummary(params.preferenceSummary);

  return {
    total: params.total,
    routeSourceLabel: ROUTE_SOURCE_LABELS[params.routeSource || 'local'] || '🔍 全部',
    preferenceLeadText: buildPreferenceLeadText(normalizedPreferenceSummary),
  };
}
