import type { Recipe, RecipeSummary, SyncTimeline } from '../types';
import type { FeedingFeedbackItem } from '../api/feedingFeedback';
import type { AIBabyVersionResult } from '../api/pairing';
import type { RecommendationSource, RecipeAdapterContext, RecommendationAdapterContext, RecipeDisplayModel, RecommendationCardViewModel, DualType, FeedbackAcceptance, ExtraPrepLevel, StatusTagType } from '../viewmodels/uiMigration';

type RecipeLike = Recipe | RecipeSummary | RecommendationSource | {
  id: string;
  name: string;
  image_url?: string[] | string;
  prep_time?: number;
  cook_time?: number;
  total_time?: number;
  difficulty?: string;
  servings?: string;
  source?: 'local' | 'tianxing' | 'ai';
  recommendation_explain?: string[];
  tags?: string[];
  stage?: string;
  texture_level?: string;
  baby_version?: unknown;
};

function toMinutesText(recipe: RecipeLike): string {
  const prep = 'prep_time' in recipe && typeof recipe.prep_time === 'number' ? recipe.prep_time : 0;
  const cook = 'cook_time' in recipe && typeof recipe.cook_time === 'number' ? recipe.cook_time : 0;
  const total = ('total_time' in recipe && typeof recipe.total_time === 'number' ? recipe.total_time : 0) || prep + cook;
  return total > 0 ? `${total} min` : 'Time TBD';
}

function getMinAgeMonths(recipe: RecipeLike): number | undefined {
  const stage = 'stage' in recipe ? recipe.stage : undefined;
  const ageRange = 'baby_version' in recipe ? recipe.baby_version && (recipe as any).baby_version?.age_range : undefined;
  const text = String(ageRange || stage || '');
  const match = text.match(/(\d{1,2})/);
  return match ? Number(match[1]) : undefined;
}

function inferExtraPrep(recipe: RecipeLike, aiBabyVersion?: AIBabyVersionResult | null, timeline?: SyncTimeline | null): ExtraPrepLevel {
  const adjustedSteps = aiBabyVersion?.adjusted_steps?.length || 0;
  if (adjustedSteps >= 6) return 'heavy';
  if (timeline?.phases?.some(phase => phase.type === 'fork')) return 'moderate';
  const hasBabyVersion = 'baby_version' in recipe && !!recipe.baby_version;
  return hasBabyVersion ? 'minimal' : 'none';
}

export function mapFeedbackAcceptance(feedback?: FeedingFeedbackItem | null): FeedbackAcceptance | undefined {
  if (!feedback) return undefined;
  if (feedback.accepted_level === 'like') return 'loved';
  if (feedback.accepted_level === 'ok') {
    const note = (feedback.note || '').toLowerCase();
    if (note.includes('观察') || note.includes('谨慎') || note.includes('少量') || note.includes('首次')) {
      return 'cautious';
    }
    return 'okay';
  }
  return 'rejected';
}

export function getDualTypeFromRecipe(recipe: RecipeLike, aiBabyVersion?: AIBabyVersionResult | null, timeline?: SyncTimeline | null): DualType {
  const hasBabyVersion = 'baby_version' in recipe && !!recipe.baby_version;
  const hasAiVersion = !!aiBabyVersion?.success;
  const canCookTogether = !!timeline?.phases?.length;
  if (hasBabyVersion && (hasAiVersion || canCookTogether)) return 'dual';
  if (hasBabyVersion || hasAiVersion) return 'baby-friendly';
  const tags = 'tags' in recipe ? recipe.tags || [] : [];
  if (tags.some(tag => /宝宝|婴儿|辅食/.test(tag))) return 'baby-only';
  return 'family-only';
}

function deriveStatusTags(context: RecipeAdapterContext, dualType: DualType, feedback?: FeedbackAcceptance): Array<{ type: StatusTagType; detail?: string }> {
  const tags: Array<{ type: StatusTagType; detail?: string }> = [];
  if (context.inPlan) tags.push({ type: 'in-plan' });
  if (context.onShoppingList) tags.push({ type: 'on-shopping-list' });
  if (feedback === 'rejected') tags.push({ type: 'previously-rejected' });
  if (feedback === 'cautious') tags.push({ type: 'retry-suggested' });
  if (dualType === 'family-only' && context.babyAgeMonths) tags.push({ type: 'needs-adaptation' });
  if (!context.timeline && !context.aiBabyVersion && dualType === 'family-only') tags.push({ type: 'low-confidence' });
  if (context.shoppingReadiness === 'ready') tags.push({ type: 'pantry-covered' });
  if (context.shoppingReadiness === 'partial') tags.push({ type: 'few-missing' });
  return tags;
}

export function mapRecipeToDisplayModel(recipe: RecipeLike, context: RecipeAdapterContext = {}): RecipeDisplayModel {
  const minAgeMonths = getMinAgeMonths(recipe);
  const currentAgeSuitable = minAgeMonths ? (context.babyAgeMonths || 0) >= minAgeMonths : undefined;
  const texture = 'texture_level' in recipe ? recipe.texture_level : ('baby_version' in recipe ? (recipe as any).baby_version?.texture : undefined);
  const extraPrep = inferExtraPrep(recipe, context.aiBabyVersion, context.timeline);
  const feedback = mapFeedbackAcceptance(context.latestFeedback);
  const dualType = getDualTypeFromRecipe(recipe, context.aiBabyVersion, context.timeline);
  const recommendationReasons = [
    ...(('recommendation_explain' in recipe ? recipe.recommendation_explain : []) || []),
    ...(context.aiBabyVersion?.summary ? [context.aiBabyVersion.summary] : []),
  ].filter(Boolean) as string[];

  const chips = [];
  if (minAgeMonths) {
    chips.push({
      key: 'age',
      label: currentAgeSuitable === false ? `${minAgeMonths}m+ (not yet)` : `${minAgeMonths}m+`,
      tone: currentAgeSuitable === false ? 'warning' : 'success',
    } as const);
  }
  if (dualType === 'dual') chips.push({ key: 'shared', label: 'Shared meal', tone: 'accent' as const });
  if (extraPrep !== 'none') chips.push({ key: 'prep', label: extraPrep === 'minimal' ? 'Minimal extra' : `+${extraPrep} prep`, tone: 'neutral' as const });
  if (texture) chips.push({ key: 'texture', label: String(texture), tone: 'neutral' as const });
  if (!chips.length) chips.push({ key: 'adult-only', label: 'Adults only', tone: 'neutral' as const });

  const adaptation = context.aiBabyVersion
    ? {
        method: context.aiBabyVersion.summary,
        texture: context.aiBabyVersion.texture_adjustments?.[0]?.adjustment,
        extraPrep,
        allergenNotes: context.aiBabyVersion.allergy_alerts,
        babySteps: context.aiBabyVersion.adjusted_steps?.map(step => step.action),
        summary: context.aiBabyVersion.summary,
      }
    : 'baby_version' in recipe && (recipe as any).baby_version
      ? {
          method: (recipe as any).baby_version.preparation_notes,
          texture: (recipe as any).baby_version.texture,
          extraPrep,
          allergenNotes: (recipe as any).baby_version.allergy_alert ? [(recipe as any).baby_version.allergy_alert] : [],
          babySteps: ((recipe as any).baby_version.steps || []).map((step: any) => step.action),
          splitStep: context.timeline?.phases?.find(phase => phase.type === 'fork')?.order,
          summary: (recipe as any).baby_version.nutrition_tips,
        }
      : undefined;

  return {
    id: recipe.id,
    title: recipe.name,
    image: Array.isArray(recipe.image_url) ? recipe.image_url[0] : (typeof recipe.image_url === 'string' ? recipe.image_url : undefined),
    cookTimeText: toMinutesText(recipe),
    difficultyLabel: 'difficulty' in recipe && recipe.difficulty ? String(recipe.difficulty) : 'Easy',
    servingsLabel: 'servings' in recipe && recipe.servings ? String(recipe.servings) : 'Servings TBD',
    dualType,
    whyItFits: recommendationReasons[0],
    recommendationReasons,
    statusTags: deriveStatusTags(context, dualType, feedback),
    babySuitability: {
      minAgeMonths,
      currentAgeSuitable,
      texture: texture ? String(texture) : undefined,
      extraPrep,
      sharedMeal: dualType === 'dual',
      chips,
    },
    adaptation,
    feedback: feedback ? { latest: feedback, count: context.latestFeedback ? 1 : 0 } : undefined,
    source: 'source' in recipe ? recipe.source : 'local',
  };
}

export function mapRecommendationToCardViewModel(recipe: RecipeLike, context: RecommendationAdapterContext = {}): RecommendationCardViewModel {
  const display = mapRecipeToDisplayModel(recipe, context);
  const reason = context.recommendationReason || display.whyItFits;
  const tags = [
    ...(context.recommendationTags || []),
    ...display.statusTags.map(tag => tag.detail || tag.type),
  ].slice(0, 4);

  return {
    recipe: {
      ...display,
      whyItFits: reason,
    },
    tags,
  };
}
