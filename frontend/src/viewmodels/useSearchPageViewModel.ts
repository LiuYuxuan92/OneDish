import { useMemo } from 'react';
import { useUnifiedSearch } from '../hooks/useRecipes';
import { mapRecommendationToCardViewModel } from '../mappers/recipeDisplayMapper';
import type { SearchExperienceViewModel, SearchResultSource } from './uiMigration';

export function useSearchPageViewModel(keyword: string): { data: SearchExperienceViewModel; isLoading: boolean } {
  const search = useUnifiedSearch(keyword);

  const data = useMemo<SearchExperienceViewModel>(() => {
    const searchData = (search.data as any)?.data || search.data;
    const items = (searchData?.results || []).map((item: SearchResultSource) => mapRecommendationToCardViewModel({ ...item, prep_time: item.prep_time ?? 0 }, {
      recommendationReason: item.recommendation_explain?.[0] || item.ranking_reasons?.[0]?.detail,
      recommendationTags: [item.source || 'search'].filter(Boolean),
    }));
    return { items, total: searchData?.total || items.length };
  }, [search.data]);

  return { data, isLoading: search.isLoading };
}
