import type { FeedingFeedbackItem } from '../api/feedingFeedback';
import { resolveRecipeImageUrl } from '../utils/media';

export type FeedbackTone = 'loved' | 'okay' | 'cautious' | 'rejected';

export interface FeedingFeedbackDisplayItem {
  id: string;
  recipeId: string;
  recipeName: string;
  recipeImage?: string;
  feedbackImages?: string[];
  tone: FeedbackTone;
  toneLabel: string;
  toneColor: string;
  summary: string;
  dateText: string;
  note?: string;
  retrySuggested: boolean;
}

function normalizeFeedbackImages(value?: string[] | null) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

const isCautiousNote = (note?: string | null) => {
  if (!note) return false;
  return /(观察|谨慎|少量|首次|试试|留意)/.test(note);
};

export function mapAcceptedLevelToTone(item: FeedingFeedbackItem): FeedbackTone {
  if (item.accepted_level === 'like') return 'loved';
  if (item.accepted_level === 'reject') return isCautiousNote(item.note) ? 'cautious' : 'rejected';
  return isCautiousNote(item.note) ? 'cautious' : 'okay';
}

export function mapFeedingFeedbackItem(item: FeedingFeedbackItem): FeedingFeedbackDisplayItem {
  const tone = mapAcceptedLevelToTone(item);
  const toneMeta = {
    loved: { label: '很喜欢', color: '#2E7D32', summary: '宝宝这次接受度很好，值得继续安排。', retrySuggested: false },
    okay: { label: '一般接受', color: '#EF6C00', summary: '可以保留在轮换里，换做法可能更好。', retrySuggested: false },
    cautious: { label: '谨慎观察', color: '#8E24AA', summary: '本次建议少量继续观察，再决定是否复做。', retrySuggested: true },
    rejected: { label: '暂时拒绝', color: '#C62828', summary: '先放缓频率，过几天换质地或搭配再试。', retrySuggested: true },
  }[tone];


  const date = item.created_at ? new Date(item.created_at) : null;
  const dateText = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : '时间未知';

  return {
    id: item.id,
    recipeId: item.recipe_id,
    recipeName: item.recipe_name || '未命名菜谱',
    recipeImage: resolveRecipeImageUrl(item.recipe_id, item.recipe_image_url),
    feedbackImages: normalizeFeedbackImages(item.image_urls),
    tone,
    toneLabel: toneMeta.label,
    toneColor: toneMeta.color,
    summary: toneMeta.summary,
    dateText,
    note: item.note || undefined,
    retrySuggested: toneMeta.retrySuggested,
  };
}

export function buildFeedbackLookup(items: FeedingFeedbackItem[]) {
  return items.reduce<Record<string, FeedingFeedbackItem>>((acc, item) => {
    if (!acc[item.recipe_id] || acc[item.recipe_id].created_at < item.created_at) {
      acc[item.recipe_id] = item;
    }
    return acc;
  }, {});
}
