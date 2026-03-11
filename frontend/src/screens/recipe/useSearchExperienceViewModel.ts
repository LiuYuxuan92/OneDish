import { useMemo } from 'react';
import type { SearchResult } from '../../api/search';

export type SearchTaskTab = 'keyword' | 'dual' | 'inventory' | 'scenario' | 'age';

export function buildSearchCardModel(item: SearchResult, lovedRecipeNames: Set<string>, rejectedRecipeNames: Set<string>) {
  const labels: string[] = [];
  const lowerName = (item.name || '').toLowerCase();
  const recommendationText = [
    ...(item.recommendation_explain || []),
    ...((item.ranking_reasons || []).map((reason) => reason.label || reason.detail || '').filter(Boolean)),
  ].join(' · ');

  const dualLike = !!item.baby_version || lowerName.includes('宝宝') || recommendationText.includes('一菜两吃');
  if (dualLike) labels.push('一菜两吃');
  if ((item.prep_time || 0) > 0 && (item.prep_time || 0) <= 20) labels.push('快手');
  if (item.source === 'local') labels.push('本地可深挖');
  if (item.source !== 'local') labels.push('可先收藏/后补全');
  if (lovedRecipeNames.has(item.name)) labels.push('宝宝接受过');
  if (rejectedRecipeNames.has(item.name)) labels.push('曾经拒绝');

  return {
    id: `${item.source}-${item.id}`,
    title: item.name,
    source: item.source,
    subtitle: item.description || recommendationText || '保留真实搜索来源与接线能力',
    meta: [
      typeof item.prep_time === 'number' ? `${item.prep_time}分钟` : null,
      item.difficulty || null,
    ].filter(Boolean),
    labels,
    whyItFits: recommendationText || undefined,
    supportsBabyTransform: item.source !== 'local',
    item,
  };
}

export function useSearchExperienceViewModel(params: {
  searchResults: SearchResult[];
  lovedRecipeNames: Set<string>;
  rejectedRecipeNames: Set<string>;
  selectedScenario: string;
  inventoryFirstEnabled: boolean;
  inventoryIngredients: string[];
}) {
  return useMemo(() => {
    const cards = params.searchResults.map((item) => buildSearchCardModel(item, params.lovedRecipeNames, params.rejectedRecipeNames));

    return {
      smartFilters: [
        { key: 'dual', label: '一菜两吃' },
        { key: 'quick', label: '快速' },
        { key: 'accepted', label: '宝宝接受过' },
        { key: 'easy', label: '易改造' },
        { key: 'inventory', label: '库存优先' },
        { key: 'safe', label: '少过敏提示' },
      ],
      taskTabs: [
        { key: 'keyword' as SearchTaskTab, label: '关键词' },
        { key: 'dual' as SearchTaskTab, label: '一菜两吃' },
        { key: 'inventory' as SearchTaskTab, label: '冰箱食材' },
        { key: 'scenario' as SearchTaskTab, label: '场景' },
        { key: 'age' as SearchTaskTab, label: '按月龄' },
      ],
      explore: {
        popularSearches: ['番茄炒蛋', '三文鱼', '鸡肉', '快手晚餐'],
        scenarioHints: ['赶时间', '清淡点', '宝宝没胃口', '库存优先'],
        ageFilters: ['6个月+', '9个月+', '12个月+', '18个月+'],
      },
      activeContext: {
        selectedScenario: params.selectedScenario,
        inventoryFirstEnabled: params.inventoryFirstEnabled,
        inventoryCount: params.inventoryIngredients.length,
      },
      cards,
    };
  }, [params]);
}
