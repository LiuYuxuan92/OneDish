import type { FeedingFeedbackItem } from '../api/feedingFeedback';
import type { AIBabyVersionResult } from '../api/pairing';
import type { IngredientItem, Recipe, RecipeStep, RecipeVersion, SeasoningItem, SyncCookingInfo, SyncTimeline } from '../types';
import type { FeedbackAcceptance, RecipeDetailPageViewModel, RecipeDetailTabKey, RecipeDetailVersionSectionViewModel } from '../viewmodels/uiMigration';
import { mapFeedbackAcceptance, mapRecipeToDisplayModel } from './recipeDisplayMapper';

type ExtendedRecipeVersion = RecipeVersion & {
  age_range?: string;
  texture?: string;
  nutrition_tips?: string;
  allergy_alert?: string;
  preparation_notes?: string;
  main_ingredients?: IngredientItem[];
  sync_cooking?: SyncCookingInfo;
};

function parseStructuredData<T>(value: T | string | null | undefined): T | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  return value;
}

function normalizeStringArray(value?: string[] | string | null): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value];
  return [];
}

function formatBabyAge(months?: number): string {
  return months ? `${months}个月` : '宝宝版';
}

function formatFeedbackDate(value?: string | null): string {
  if (!value) return '时间未知';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  return date.toLocaleDateString();
}

function buildHeroSummary(isPaired: boolean): string {
  return isPaired
    ? '先按家庭主菜来理解，再顺手分出宝宝版本；这是这道菜最适合的阅读方式。'
    : '先看成人主菜，再决定是否切到宝宝版做适配；页面按这个决策顺序组织。';
}

function buildWhyItFits(params: {
  isPaired: boolean;
  recipe: Recipe;
  babyVersion?: ExtendedRecipeVersion;
  feedbacks: FeedingFeedbackItem[];
}): string[] {
  const latestFeedback = params.feedbacks[0];
  return [
    params.isPaired
      ? '这道菜天然符合“一菜两吃”，能先做家庭主菜，再顺手分出宝宝版本。'
      : '这道菜可以在现有成人做法上继续延展出宝宝版本。',
    params.babyVersion?.texture ? `当前宝宝版质地建议：${params.babyVersion.texture}。` : null,
    params.recipe.tags?.length ? `命中标签：${params.recipe.tags.slice(0, 3).join('、')}。` : null,
    latestFeedback?.accepted_level === 'like' ? '最近一次反馈是喜欢，可以放心继续轮换。' : null,
    latestFeedback?.accepted_level === 'reject' ? '最近一次反馈是拒绝，建议换质地或搭配后再试。' : null,
  ].filter(Boolean) as string[];
}

function mapIngredients(items?: IngredientItem[]): RecipeDetailVersionSectionViewModel['ingredients'] {
  return (items || []).map((item) => ({
    name: item.name,
    amount: item.amount,
    note: item.note,
  }));
}

function mapSeasonings(items?: SeasoningItem[]): RecipeDetailVersionSectionViewModel['seasonings'] {
  return (items || []).map((item) => ({
    name: item.name,
    amount: item.amount,
  }));
}

function mapSteps(items?: RecipeStep[]): RecipeDetailVersionSectionViewModel['steps'] {
  return (items || []).map((step, index) => ({
    id: `step-${step.step || index + 1}`,
    indexLabel: String(step.step || index + 1),
    action: step.action,
    timeText: step.time > 0 ? `${step.time}分钟` : undefined,
    toolsText: step.tools?.length ? step.tools.join(', ') : undefined,
    note: step.note,
    highlighted: !!step.note?.includes('🔥'),
  }));
}

function buildVersionSection(params: {
  key: Extract<RecipeDetailTabKey, 'adult' | 'baby'>;
  version?: ExtendedRecipeVersion;
}): RecipeDetailVersionSectionViewModel | undefined {
  if (!params.version) return undefined;
  return {
    key: params.key,
    title: params.key === 'adult' ? '大人版详情' : '宝宝版详情',
    ageBadge: params.key === 'baby' ? params.version.age_range : undefined,
    ingredients: mapIngredients(params.version.ingredients),
    seasonings: mapSeasonings(params.version.seasonings),
    steps: mapSteps(params.version.steps),
    nutritionTips: params.version.nutrition_tips,
    allergyAlert: params.version.allergy_alert,
    preparationNotes: params.version.preparation_notes,
  };
}

function mapFeedbackLabel(value?: FeedbackAcceptance): string | undefined {
  if (value === 'loved') return '最近反馈：喜欢';
  if (value === 'okay') return '最近反馈：一般接受';
  if (value === 'cautious') return '最近反馈：建议谨慎再试';
  if (value === 'rejected') return '最近反馈：暂时拒绝';
  return undefined;
}

export function mapRecipeDetailPage(params: {
  recipe: Recipe;
  babyAgeMonths?: number;
  activeTab?: RecipeDetailTabKey;
  babyVersion?: unknown;
  timeline?: SyncTimeline | null;
  feedbacks?: FeedingFeedbackItem[];
  aiBabyVersion?: AIBabyVersionResult | null;
  inPlan?: boolean;
  onShoppingList?: boolean;
}): RecipeDetailPageViewModel {
  const activeTab = params.activeTab || 'adult';
  const adultVersion = parseStructuredData<ExtendedRecipeVersion>(params.recipe.adult_version);
  const fallbackBabyVersion = parseStructuredData<ExtendedRecipeVersion>(params.recipe.baby_version as ExtendedRecipeVersion | string | undefined);
  const babyVersion = parseStructuredData<ExtendedRecipeVersion>(params.babyVersion as ExtendedRecipeVersion | string | undefined) || fallbackBabyVersion;
  const feedbacks = params.feedbacks || [];
  const feedbackAcceptance = mapFeedbackAcceptance(feedbacks[0]);
  const recipeDisplay = mapRecipeToDisplayModel(params.recipe, {
    babyAgeMonths: params.babyAgeMonths,
    inPlan: params.inPlan,
    onShoppingList: params.onShoppingList,
    latestFeedback: feedbacks[0],
    aiBabyVersion: params.aiBabyVersion,
    timeline: params.timeline,
  });
  const isPaired = params.recipe.name.includes('/');
  const currentVersion = activeTab === 'baby'
    ? buildVersionSection({ key: 'baby', version: babyVersion })
    : buildVersionSection({ key: 'adult', version: adultVersion });

  return {
    isPaired,
    hero: {
      title: params.recipe.name,
      summary: buildHeroSummary(isPaired),
      imageUrls: normalizeStringArray(params.recipe.image_url),
      meta: [
        { key: 'time', label: recipeDisplay.cookTimeText },
        { key: 'difficulty', label: recipeDisplay.difficultyLabel },
        { key: 'servings', label: recipeDisplay.servingsLabel },
      ],
      statusTags: recipeDisplay.statusTags,
      whyItFits: buildWhyItFits({
        isPaired,
        recipe: params.recipe,
        babyVersion,
        feedbacks,
      }),
      versionCards: [
        {
          key: 'adult',
          title: '大人版',
          subtitle: `${recipeDisplay.cookTimeText} · ${recipeDisplay.difficultyLabel}`,
          description: adultVersion?.steps?.[0]?.action || (params.recipe as Recipe & { description?: string }).description || '先按成人版判断这道菜值不值得做。',
        },
        {
          key: 'baby',
          title: '宝宝版',
          subtitle: babyVersion?.age_range || `${formatBabyAge(params.babyAgeMonths)} 适配`,
          description: babyVersion?.preparation_notes || babyVersion?.texture || '切换后查看真实宝宝适配、质地和月龄版本。',
        },
      ],
    },
    ingredientComparison: isPaired
      ? (adultVersion?.main_ingredients || []).map((item, index) => ({
          name: item.name,
          adultAmount: item.amount,
          babyAmount: babyVersion?.main_ingredients?.[index]?.amount,
        }))
      : [],
    currentVersion,
    timerSteps: (currentVersion?.steps || [])
      .filter((step) => step.timeText)
      .map((step) => ({
        id: step.id,
        name: `步骤${step.indexLabel}`,
        minutes: Number(step.timeText?.replace('分钟', '') || 0),
      }))
      .filter((step) => step.minutes > 0),
    tips: parseStructuredData<string[]>(params.recipe.cooking_tips as string[] | string | undefined) || [],
    timelinePanel: {
      hasTimeline: !!params.timeline,
      summary: params.timeline
        ? `同步时间线已就绪，可直接按并行节奏开做。`
        : '需要时再切进来安排并行节奏；默认不抢首屏注意力。',
      totalTimeText: params.timeline?.total_time ? `${params.timeline.total_time}分钟完成` : undefined,
      savedTimeText: params.timeline?.time_saved ? `预计节省${params.timeline.time_saved}分钟` : undefined,
      sharedSteps: babyVersion?.sync_cooking?.shared_steps?.map((step) => String(step)) || [],
      syncTips: babyVersion?.sync_cooking?.tips,
    },
    feedback: {
      latestLabel: mapFeedbackLabel(feedbackAcceptance),
      items: feedbacks.map((item) => ({
        id: item.id,
        label: item.accepted_level === 'like' ? '喜欢' : item.accepted_level === 'ok' ? '一般' : '拒绝',
        dateText: formatFeedbackDate(item.created_at),
        note: item.note || undefined,
      })),
    },
  };
}

export function parseRecipeVersion<T>(value: T | string | null | undefined): T | undefined {
  return parseStructuredData<T>(value);
}
