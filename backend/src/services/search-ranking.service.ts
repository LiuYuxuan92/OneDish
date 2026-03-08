import { db } from '../config/database';
import { SearchResult } from '../adapters/search.adapter';
import { userPreferenceService } from './user-preference.service';

export interface SearchRankingContext {
  userId?: string;
  keyword?: string;
  inventoryIngredients?: string[];
  scenario?: string;
  source?: 'local' | 'tianxing' | 'ai' | 'cache' | 'web';
}

interface ScenarioProfile {
  labels: string[];
  maxPrepTime?: number;
  difficultyPreference?: 'easy' | 'medium' | 'hard';
  preferIngredients?: string[];
  excludeIngredients?: string[];
  tags?: string[];
}

const normalizeText = (value: unknown): string => String(value || '').trim().toLowerCase();

const uniqueStrings = (items: unknown[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  items.forEach((item) => {
    const normalized = String(item || '').trim();
    if (!normalized) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
};

const splitIngredients = (value: unknown): string[] => {
  if (Array.isArray(value)) return uniqueStrings(value as unknown[]);
  if (typeof value === 'string') {
    return uniqueStrings(value.split(/[、,，/\n\r;]/));
  }
  return [];
};

const parseIngredientName = (value: string): string => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const withoutAmount = trimmed.replace(/[0-9０-９]+(?:\.[0-9]+)?\s*(克|g|kg|斤|两|ml|毫升|升|个|颗|勺|茶匙|汤匙|片|块|根|把|袋|盒|碗|杯|适量)?/gi, ' ');
  return withoutAmount.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, ' ').replace(/\s+/g, ' ').trim();
};

export class SearchRankingService {
  async rank(results: SearchResult[], context: SearchRankingContext = {}): Promise<SearchResult[]> {
    if (!results.length) return [];

    const userPrefs = await userPreferenceService.getUserPreferences(context.userId);
    const inventoryFromDb = context.userId
      ? await db('ingredient_inventory').where('user_id', context.userId).where('quantity', '>', 0).select('ingredient_name')
      : [];

    const inventoryIngredients = uniqueStrings([
      ...splitIngredients(context.inventoryIngredients || []),
      ...inventoryFromDb.map((row: any) => row.ingredient_name),
    ]);

    const scenarioProfile = this.detectScenarioProfile(context.keyword || '', context.scenario || '');

    const mergedPrefs = {
      ...userPrefs,
      prefer_ingredients: uniqueStrings([...(userPrefs.prefer_ingredients || []), ...(scenarioProfile.preferIngredients || [])]),
      exclude_ingredients: uniqueStrings([...(userPrefs.exclude_ingredients || []), ...(scenarioProfile.excludeIngredients || [])]),
      cooking_time_limit: scenarioProfile.maxPrepTime || userPrefs.cooking_time_limit,
      difficulty_preference: scenarioProfile.difficultyPreference || userPrefs.difficulty_preference,
    };

    return results
      .map((item, index) => this.scoreItem(item, index, mergedPrefs, inventoryIngredients, scenarioProfile))
      .sort((a, b) => {
        const scoreDiff = b.totalScore - a.totalScore;
        if (scoreDiff !== 0) return scoreDiff;
        const prepDiff = (a.item.prep_time || 0) - (b.item.prep_time || 0);
        if (prepDiff !== 0) return prepDiff;
        return a.index - b.index;
      })
      .map(({ item, rankingReasons, recommendationExplain }) => ({
        ...item,
        ranking_reasons: rankingReasons,
        recommendation_explain: recommendationExplain,
      }));
  }

  private scoreItem(item: SearchResult, index: number, prefs: any, inventoryIngredients: string[], scenarioProfile: ScenarioProfile) {
    const ingredientNames = this.extractIngredientNames(item);
    const matchedInventory = inventoryIngredients.filter((target) =>
      ingredientNames.some((ingredient) => ingredient.includes(target) || target.includes(ingredient))
    );
    const missingIngredients = Math.max(0, ingredientNames.length - matchedInventory.length);

    let totalScore = 0;
    const rankingReasons: Array<{ code: string; label: string; detail?: string; contribution?: number }> = [];
    const recommendationExplain: string[] = [];

    const addReason = (code: string, label: string, contribution: number, detail?: string, explain?: string) => {
      if (!contribution) return;
      totalScore += contribution;
      rankingReasons.push({ code, label, detail, contribution: Number(contribution.toFixed(2)) });
      if (explain) recommendationExplain.push(explain);
    };

    if (inventoryIngredients.length > 0) {
      const inventoryScore = matchedInventory.length * 18 - missingIngredients * 4;
      addReason(
        'inventory',
        matchedInventory.length > 0 ? '库存覆盖更高' : '库存命中较少',
        inventoryScore,
        matchedInventory.length > 0
          ? `命中${matchedInventory.slice(0, 4).join('、')}${missingIngredients > 0 ? `，缺口${missingIngredients}项` : ''}`
          : `现有库存命中较少，缺口${missingIngredients}项`,
        matchedInventory.length > 0
          ? `优先使用家里现有食材：${matchedInventory.slice(0, 3).join('、')}`
          : '这道菜需要额外补一些食材'
      );
    }

    const pref = userPreferenceService.scoreRecipeByPreferences(item, prefs, prefs.cooking_time_limit);
    if (pref.score !== 0) {
      addReason(
        'preference',
        '符合偏好设置',
        pref.score,
        pref.reasons.slice(0, 2).join('；'),
        pref.reasons[0] || '已按你的偏好做过筛选'
      );
    }

    const scenarioScore = this.scoreScenario(item, scenarioProfile, ingredientNames);
    if (scenarioScore.score !== 0) {
      addReason('scenario', '匹配当前场景', scenarioScore.score, scenarioScore.detail, scenarioScore.explain);
    }

    if (item.source && item.source !== 'local') {
      addReason('source', '已走统一偏好重排', 2, `${item.source} 结果也按库存/偏好重排`, '联网 / AI 结果也一起按你的条件重新排序');
    }

    return { item, index, totalScore, rankingReasons, recommendationExplain };
  }

  private extractIngredientNames(item: SearchResult): string[] {
    const rawIngredients = Array.isArray(item.ingredients)
      ? item.ingredients
      : userPreferenceService.extractRecipeIngredientNames(item as any);

    return uniqueStrings(rawIngredients.map((name) => parseIngredientName(String(name || ''))).filter(Boolean));
  }

  private detectScenarioProfile(keyword: string, scenario: string): ScenarioProfile {
    const text = `${keyword} ${scenario}`.trim();
    const profile: ScenarioProfile = { labels: [] };
    if (!text) return profile;

    if (/赶时间|快手|省事|别太复杂|简单点|不折腾/.test(text)) {
      profile.labels.push('赶时间');
      profile.maxPrepTime = Math.min(profile.maxPrepTime || 20, 20);
      profile.difficultyPreference = 'easy';
      profile.tags = uniqueStrings([...(profile.tags || []), '快手菜', '家常菜']);
    }

    if (/清淡|清爽|少油|咳嗽|肠胃|养胃/.test(text)) {
      profile.labels.push('清淡');
      profile.tags = uniqueStrings([...(profile.tags || []), '清淡']);
      profile.excludeIngredients = uniqueStrings([...(profile.excludeIngredients || []), '辣椒']);
    }

    if (/没胃口|胃口差|开胃/.test(text)) {
      profile.labels.push('宝宝没胃口');
      profile.tags = uniqueStrings([...(profile.tags || []), '开胃']);
      profile.preferIngredients = uniqueStrings([...(profile.preferIngredients || []), '番茄', '山楂', '南瓜']);
    }

    if (/想吃鱼|吃鱼|鱼肉/.test(text)) {
      profile.labels.push('想吃鱼');
      profile.preferIngredients = uniqueStrings([...(profile.preferIngredients || []), '鱼']);
      profile.tags = uniqueStrings([...(profile.tags || []), '鱼']);
    }

    return profile;
  }

  private scoreScenario(item: SearchResult, scenarioProfile: ScenarioProfile, ingredientNames: string[]) {
    if (!scenarioProfile.labels.length) {
      return { score: 0, detail: '', explain: '' };
    }

    const haystack = [
      item.name,
      item.description,
      ...(item.tags || []),
      ...(item.category || []),
      ...ingredientNames,
      item.difficulty,
    ].map((x) => normalizeText(x)).join(' ');

    let score = 0;
    const matched: string[] = [];

    (scenarioProfile.tags || []).forEach((tag) => {
      if (haystack.includes(normalizeText(tag))) {
        score += 8;
        matched.push(tag);
      }
    });

    (scenarioProfile.preferIngredients || []).forEach((ingredient) => {
      if (ingredientNames.some((name) => name.includes(ingredient) || ingredient.includes(name))) {
        score += 12;
        matched.push(ingredient);
      }
    });

    if (scenarioProfile.maxPrepTime && item.prep_time && item.prep_time <= scenarioProfile.maxPrepTime) {
      score += 10;
      matched.push(`${scenarioProfile.maxPrepTime}分钟内`);
    }

    if (scenarioProfile.difficultyPreference) {
      const difficulty = normalizeText(item.difficulty);
      if (
        (scenarioProfile.difficultyPreference === 'easy' && /简单|easy/.test(difficulty)) ||
        (scenarioProfile.difficultyPreference === 'medium' && /中等|medium/.test(difficulty)) ||
        (scenarioProfile.difficultyPreference === 'hard' && /困难|复杂|hard/.test(difficulty))
      ) {
        score += 6;
      }
    }

    return {
      score,
      detail: matched.length > 0 ? `场景「${scenarioProfile.labels.join(' / ')}」命中：${matched.slice(0, 4).join('、')}` : `已按场景「${scenarioProfile.labels.join(' / ')}」调权`,
      explain: matched.length > 0 ? `当前场景更适合：${matched.slice(0, 3).join('、')}` : `已按你的场景偏好做轻量映射`,
    };
  }
}

export const searchRankingService = new SearchRankingService();
