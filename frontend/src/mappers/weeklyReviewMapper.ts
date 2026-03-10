import type { WeeklyReviewData, WeeklyReviewRecipeMeta, WeeklyReviewSuggestion } from '../api/weeklyReview';

export interface WeeklyReviewDisplayModel {
  stats: Array<{ label: string; value: string; helper?: string }>;
  acceptedRecipes: WeeklyReviewRecipeMeta[];
  cautiousRecipes: WeeklyReviewRecipeMeta[];
  rejectedRecipes: WeeklyReviewRecipeMeta[];
  suggestions: WeeklyReviewSuggestion[];
  trendText: string;
  nutritionText?: string;
  insightText: string;
}

export function mapWeeklyReview(review: WeeklyReviewData | null | undefined): WeeklyReviewDisplayModel | null {
  if (!review) return null;

  const acceptedRecipes = review.top_accepted_recipes || [];
  const cautiousRecipes = review.cautious_recipes || [];
  const rejectedRecipes = cautiousRecipes.filter(item => item.accepted_level === 'reject');

  const trendText = review.trend_signal === 'improving'
    ? '这周整体接受度在上升。'
    : review.trend_signal === 'declining'
      ? '这周接受度有所波动，下周建议更保守一点。'
      : review.trend_signal === 'stable'
        ? '这周整体喂养节奏比较稳定。'
        : '数据还在积累中，继续记录会更有参考价值。';

  const dualMealShare = review.unique_recipes_count > 0
    ? `${review.unique_recipes_count} 道菜形成了家庭共餐的有效样本。`
    : '还在积累一菜两吃样本。';

  return {
    stats: [
      { label: '反馈次数', value: String(review.total_feedback_count), helper: `${review.feeding_days_count} 天有记录` },
      { label: '喜欢', value: String(review.like_count), helper: `${review.ok_count} 次一般接受` },
      { label: '新尝试', value: String(review.new_recipe_count), helper: `${review.unique_recipes_count} 道菜` },
      { label: '谨慎项', value: String(review.cautious_recipes.length), helper: review.allergy_flag_count ? `${review.allergy_flag_count} 次过敏标记` : '暂无过敏标记' },
    ],
    acceptedRecipes,
    cautiousRecipes,
    rejectedRecipes,
    suggestions: review.next_week_suggestions || [],
    trendText,
    nutritionText: undefined,
    insightText: dualMealShare,
  };
}
