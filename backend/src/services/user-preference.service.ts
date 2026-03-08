import { db } from '../config/database';

export interface NormalizedUserPreferences {
  default_baby_age?: number;
  prefer_ingredients: string[];
  exclude_ingredients: string[];
  cooking_time_limit?: number;
  difficulty_preference?: string;
}

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
  }
  if (typeof value === 'string') {
    return [...new Set(
      value
        .split(/[、,，/\n\r;]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )];
  }
  return [];
};

const normalizeDifficulty = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim().toLowerCase();
  if (!raw) return undefined;

  if (['easy', '简单', '容易', 'low'].includes(raw)) return 'easy';
  if (['medium', 'normal', '中等', '适中'].includes(raw)) return 'medium';
  if (['hard', 'difficult', '困难', '复杂', 'high'].includes(raw)) return 'hard';
  return raw;
};

const normalizeNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

export class UserPreferenceService {
  normalizePreferences(raw: any): NormalizedUserPreferences {
    const source = typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return {};
          }
        })()
      : (raw && typeof raw === 'object' ? raw : {});

    return {
      default_baby_age: normalizeNumber(source.default_baby_age),
      prefer_ingredients: normalizeStringArray(source.prefer_ingredients),
      exclude_ingredients: normalizeStringArray(source.exclude_ingredients),
      cooking_time_limit: normalizeNumber(source.cooking_time_limit),
      difficulty_preference: normalizeDifficulty(source.difficulty_preference),
    };
  }

  async getUserPreferences(userId?: string): Promise<NormalizedUserPreferences> {
    if (!userId) {
      return this.normalizePreferences({});
    }

    const user = await db('users').where('id', userId).first();
    return this.normalizePreferences(user?.preferences);
  }

  recipeContainsExcludedIngredient(recipe: any, excludeIngredients: string[]): boolean {
    if (!excludeIngredients.length) return false;
    const ingredients = this.extractRecipeIngredientNames(recipe);
    return ingredients.some((ingredient) =>
      excludeIngredients.some((excluded) => ingredient.includes(excluded) || excluded.includes(ingredient))
    );
  }

  extractRecipeIngredientNames(recipe: any): string[] {
    const sources = [recipe?.adult_version, recipe?.baby_version];
    const names: string[] = [];

    for (const source of sources) {
      const parsed = typeof source === 'string'
        ? (() => {
            try {
              return JSON.parse(source);
            } catch {
              return null;
            }
          })()
        : source;

      const ingredients = Array.isArray(parsed?.ingredients) ? parsed.ingredients : [];
      for (const ingredient of ingredients) {
        const name = String(ingredient?.name || '').trim();
        if (name) names.push(name);
      }
    }

    return [...new Set(names)];
  }

  matchesBabyAge(recipe: any, babyAgeMonths?: number): boolean {
    if (!babyAgeMonths) return true;

    const stageMin = this.parseBoundary(recipe?.age_min ?? recipe?.baby_age_min);
    const stageMax = this.parseBoundary(recipe?.age_max ?? recipe?.baby_age_max);
    if (stageMin !== null && babyAgeMonths < stageMin) return false;
    if (stageMax !== null && babyAgeMonths > stageMax) return false;

    const ranges = [recipe?.baby_age_range, recipe?.suitable_baby_age, recipe?.stage]
      .map((item) => String(item || '').trim())
      .filter(Boolean);

    for (const range of ranges) {
      const match = range.match(/(\d+)\s*[-~至]\s*(\d+)/);
      if (match) {
        const min = Number(match[1]);
        const max = Number(match[2]);
        if (Number.isFinite(min) && Number.isFinite(max)) {
          return babyAgeMonths >= min && babyAgeMonths <= max;
        }
      }
      const plusMatch = range.match(/(\d+)\s*\+/);
      if (plusMatch) {
        const min = Number(plusMatch[1]);
        if (Number.isFinite(min) && babyAgeMonths >= min) {
          return true;
        }
      }
    }

    return true;
  }

  scoreRecipeByPreferences(recipe: any, prefs: NormalizedUserPreferences, fallbackMaxTime?: number) {
    const ingredients = this.extractRecipeIngredientNames(recipe);
    const prepTime = Number(recipe?.prep_time || recipe?.total_time || 0);
    const effectiveTimeLimit = prefs.cooking_time_limit || fallbackMaxTime;
    const difficulty = String(recipe?.calibrated_difficulty || recipe?.difficulty || '').toLowerCase();

    let score = 0;
    const reasons: string[] = [];

    const preferredHits = prefs.prefer_ingredients.filter((target) =>
      ingredients.some((ingredient) => ingredient.includes(target) || target.includes(ingredient))
    );
    if (preferredHits.length > 0) {
      score += preferredHits.length * 25;
      reasons.push(`命中偏好食材:${preferredHits.join('、')}`);
    }

    if (effectiveTimeLimit && prepTime > 0) {
      if (prepTime <= effectiveTimeLimit) {
        score += 12;
        reasons.push('烹饪时间符合偏好');
      } else {
        const over = prepTime - effectiveTimeLimit;
        score -= Math.min(30, over);
        reasons.push('烹饪时间超出偏好');
      }
    }

    if (prefs.difficulty_preference) {
      if (difficulty === prefs.difficulty_preference) {
        score += 10;
        reasons.push('难度符合偏好');
      } else if (prefs.difficulty_preference === 'easy' && difficulty === 'hard') {
        score -= 12;
        reasons.push('难度偏高');
      } else if (prefs.difficulty_preference === 'hard' && difficulty === 'easy') {
        score -= 4;
      } else {
        score -= 2;
      }
    }

    return { score, reasons, prepTime, difficulty, preferredHits };
  }

  private parseBoundary(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const match = value.match(/(\d+)/);
      if (match) return Number(match[1]);
    }
    return null;
  }
}

export const userPreferenceService = new UserPreferenceService();
