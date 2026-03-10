import { useMemo } from 'react';
import { useWeeklyReview } from '../../hooks/useWeeklyReview';
import { mapWeeklyReview } from '../../mappers/weeklyReviewMapper';

export function useWeeklyReviewViewModel(params?: { week_start?: string; child_id?: string }) {
  const query = useWeeklyReview(params);

  const review = useMemo(() => mapWeeklyReview(query.data?.review), [query.data?.review]);

  return {
    ...query,
    review,
    weekStart: query.data?.week_start,
    weekEnd: query.data?.week_end,
    generatedAt: query.data?.generated_at,
  };
}
