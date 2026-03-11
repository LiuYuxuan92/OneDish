import { useMemo } from 'react';
import { buildSearchResultSummary, mapSearchResultToCardViewModel } from '../mappers/searchMapper';
import type { SearchPageViewModel, SearchPreferenceSource, SearchResultSource } from './uiMigration';

const TASK_TABS: SearchPageViewModel['taskTabs'] = [
  { key: 'keyword', label: '关键词' },
  { key: 'dual', label: '一菜两吃' },
  { key: 'inventory', label: '冰箱食材' },
  { key: 'scenario', label: '场景' },
  { key: 'age', label: '按月龄' },
];

const EXPLORE: SearchPageViewModel['explore'] = {
  popularSearches: ['番茄炒蛋', '三文鱼', '鸡肉', '快手晚餐'],
  scenarioHints: ['赶时间', '清淡点', '宝宝没胃口', '库存优先'],
  ageFilters: ['6个月+', '9个月+', '12个月+', '18个月+'],
};

export function useSearchPageViewModel(params: {
  searchResults: SearchResultSource[];
  total: number;
  routeSource?: string;
  selectedScenario: string;
  inventoryFirstEnabled: boolean;
  inventoryIngredients: string[];
  lovedRecipeNames: Set<string>;
  rejectedRecipeNames: Set<string>;
  preferences?: SearchPreferenceSource | null;
}): SearchPageViewModel {
  return useMemo<SearchPageViewModel>(() => ({
    taskTabs: TASK_TABS,
    explore: EXPLORE,
    activeContext: {
      selectedScenario: params.selectedScenario,
      inventoryFirstEnabled: params.inventoryFirstEnabled,
      inventoryCount: params.inventoryIngredients.length,
    },
    cards: params.searchResults.map((item) => mapSearchResultToCardViewModel({
      item,
      lovedRecipeNames: params.lovedRecipeNames,
      rejectedRecipeNames: params.rejectedRecipeNames,
      preferenceSummary: params.preferences,
    })),
    resultSummary: buildSearchResultSummary({
      total: params.total,
      routeSource: params.routeSource,
      preferenceSummary: params.preferences,
    }),
  }), [
    params.inventoryFirstEnabled,
    params.inventoryIngredients,
    params.lovedRecipeNames,
    params.preferences,
    params.rejectedRecipeNames,
    params.routeSource,
    params.searchResults,
    params.selectedScenario,
    params.total,
  ]);
}
