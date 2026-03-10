import { useMemo } from 'react';
import { useRecentFeedingFeedback } from '../../hooks/useFeedingFeedback';
import { mapFeedingFeedbackItem } from '../../mappers/feedingFeedbackMapper';

export function useFeedingFeedbackViewModel() {
  const query = useRecentFeedingFeedback({ limit: 50 });

  const records = useMemo(() => {
    const raw = Array.isArray(query.data) ? query.data : [];
    return raw.map(mapFeedingFeedbackItem);
  }, [query.data]);

  const grouped = useMemo(() => ({
    loved: records.filter(item => item.tone === 'loved'),
    okay: records.filter(item => item.tone === 'okay'),
    cautious: records.filter(item => item.tone === 'cautious'),
    rejected: records.filter(item => item.tone === 'rejected'),
    retry: records.filter(item => item.retrySuggested),
  }), [records]);

  const summaryCards = useMemo(() => ([
    { label: '喜欢', value: grouped.loved.length, tone: 'loved' },
    { label: '可继续尝试', value: grouped.okay.length, tone: 'okay' },
    { label: '谨慎观察', value: grouped.cautious.length, tone: 'cautious' },
    { label: '暂时拒绝', value: grouped.rejected.length, tone: 'rejected' },
  ]), [grouped]);

  return {
    ...query,
    records,
    grouped,
    summaryCards,
  };
}
