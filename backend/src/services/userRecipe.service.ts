import { db } from '../config/database';
import { RiskHit, UgcRiskService } from './ugc-risk.service';

const JSON_FIELDS = ['original_data', 'adult_version', 'baby_version', 'cooking_tips', 'image_url', 'tags', 'category', 'allergens', 'step_branches'];
const RECOMMEND_POOL_THRESHOLD = 75;

export class SafetyValidationError extends Error {
  constructor(public readonly riskHits: RiskHit[]) {
    super(`内容安全校验未通过：${riskHits.map((h) => `${h.reason}${h.suggestion ? `（建议：${h.suggestion}）` : ''}`).join('；')}`);
    this.name = 'SafetyValidationError';
  }
}

export class UserRecipeService {
  private readonly riskService = new UgcRiskService();

  async createDraft(userId: string, payload: any) {
    return this.upsertDraft(userId, undefined, payload);
  }

  async upsertDraft(userId: string, recipeId: string | undefined, payload: any) {
    const data = this.normalizePayload(payload);

    if (recipeId) {
      const quality = this.computeQualityFields({ ...data, status: 'draft' });
      const [updated] = await db('user_recipes')
        .where({ id: recipeId, user_id: userId, is_active: true })
        .update({
          ...data,
          ...quality,
          status: 'draft',
          updated_at: db.fn.now(),
        })
        .returning('*');

      if (!updated) throw new Error('菜谱不存在');
      return this.parseRecipe(updated);
    }

    const quality = this.computeQualityFields({ ...data, status: 'draft' });
    const [created] = await db('user_recipes')
      .insert({
        user_id: userId,
        source: payload?.source || 'ugc',
        ...data,
        ...quality,
        status: 'draft',
      })
      .returning('*');

    return this.parseRecipe(created);
  }

  async submitForReview(userId: string, recipeId: string) {
    const existing = await db('user_recipes')
      .where({ id: recipeId, user_id: userId, is_active: true })
      .whereIn('status', ['draft', 'rejected'])
      .first();

    if (!existing) throw new Error('仅草稿/驳回状态可提交审核');

    const safetyResult = this.riskService.evaluate(existing);
    const blockingHits = safetyResult.riskHits.filter((h) => h.level === 'block');
    if (!safetyResult.safeForSubmit) {
      const reason = `内容安全校验未通过：${blockingHits.map((h) => `${h.reason}${h.suggestion ? `（建议：${h.suggestion}）` : ''}`).join('；')}`;
      await db('user_recipes')
        .where({ id: recipeId })
        .update({ reject_reason: reason, updated_at: db.fn.now() });
      throw new SafetyValidationError(blockingHits);
    }

    const quality = this.computeQualityFields({ ...existing, status: 'pending' });
    const [row] = await db('user_recipes')
      .where({ id: recipeId, user_id: userId, is_active: true })
      .whereIn('status', ['draft', 'rejected'])
      .update({ status: 'pending', submitted_at: db.fn.now(), reject_reason: null, rejected_at: null, ...quality, updated_at: db.fn.now() })
      .returning('*');

    return this.parseRecipe(row);
  }

  async reviewRecipe(recipeId: string, action: 'published' | 'rejected', reason?: string) {
    const current = await db('user_recipes').where({ id: recipeId, is_active: true, status: 'pending' }).first();
    if (!current) throw new Error('仅待审核内容可处理');

    if (action === 'published') {
      const safetyResult = this.riskService.evaluate(current);
      const blockingHits = safetyResult.riskHits.filter((h) => h.level === 'block');
      if (!safetyResult.safeForSubmit) {
        throw new SafetyValidationError(blockingHits);
      }
    }

    const patch: any = {
      status: action,
      ...this.computeQualityFields({ ...current, status: action }),
      updated_at: db.fn.now(),
    };
    if (action === 'published') patch.published_at = db.fn.now();
    if (action === 'rejected') {
      patch.rejected_at = db.fn.now();
      patch.reject_reason = reason || '内容需完善';
    }

    const [row] = await db('user_recipes')
      .where({ id: recipeId, is_active: true, status: 'pending' })
      .update(patch)
      .returning('*');

    return this.parseRecipe(row);
  }

  async getPublishedRecipes(page = 1, limit = 20, userId?: string) {
    const offset = (page - 1) * limit;
    const [countResult] = await db('user_recipes').where({ status: 'published', is_active: true }).count('id as total');
    const total = Number((countResult as any)?.total || 0);

    const rows = await db('user_recipes as ur')
      .leftJoin('user_recipe_favorites as uf', function () {
        this.on('uf.user_recipe_id', '=', 'ur.id');
        if (userId) this.andOn('uf.user_id', '=', db.raw('?', [userId]));
      })
      .where('ur.status', 'published')
      .where('ur.is_active', true)
      .select('ur.*', db.raw('COUNT(uf.id) > 0 as is_favorited'))
      .groupBy('ur.id')
      .orderBy('ur.published_at', 'desc')
      .offset(offset)
      .limit(limit);

    return { total, page, limit, items: rows.map((r: any) => this.parseRecipe(r)) };
  }

  async getUserRecipes(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const [countResult] = await db('user_recipes')
      .where('user_id', userId)
      .where('is_active', true)
      .count('id as total');

    const total = Number((countResult as any).total);

    const recipes = await db('user_recipes')
      .where('user_id', userId)
      .where('is_active', true)
      .orderBy('updated_at', 'desc')
      .offset(offset)
      .limit(limit);

    return {
      total,
      page,
      limit,
      items: recipes.map((r: any) => this.parseRecipe(r)),
    };
  }

  async getUserRecipeDetail(userId: string | undefined, recipeId: string) {
    const query = db('user_recipes').where('id', recipeId).where('is_active', true);
    if (userId) {
      query.andWhere((qb) => qb.where('user_id', userId).orWhere('status', 'published'));
    } else {
      query.andWhere('status', 'published');
    }

    const recipe = await query.first();
    if (!recipe) throw new Error('菜谱不存在');

    let is_favorited = false;
    if (userId && recipe.status === 'published') {
      const fav = await db('user_recipe_favorites').where({ user_id: userId, user_recipe_id: recipeId }).first();
      is_favorited = !!fav;
    }

    return this.parseRecipe({ ...recipe, is_favorited });
  }

  async toggleFavorite(userId: string, recipeId: string) {
    const recipe = await db('user_recipes').where({ id: recipeId, status: 'published', is_active: true }).first();
    if (!recipe) throw new Error('仅可收藏已发布内容');

    const existing = await db('user_recipe_favorites').where({ user_id: userId, user_recipe_id: recipeId }).first();
    if (existing) {
      await db('user_recipe_favorites').where({ id: existing.id }).delete();
      return { favorited: false };
    }

    await db('user_recipe_favorites').insert({ user_id: userId, user_recipe_id: recipeId });
    return { favorited: true };
  }

  async saveFromSearch(userId: string, searchResult: any) {
    return this.createDraft(userId, searchResult);
  }

  async recomputeQualityScores(ids?: string[]) {
    let query = db('user_recipes').where({ is_active: true });
    if (ids?.length) query = query.whereIn('id', ids) as any;

    const rows = await query.select('*');
    let affected = 0;
    for (const row of rows) {
      const reportAgg = await db('ugc_quality_events')
        .where({ user_recipe_id: row.id, event_type: 'report' })
        .count('id as total')
        .first();
      const adoptionAgg = await db('ugc_quality_events')
        .where({ user_recipe_id: row.id, event_type: 'adoption' })
        .select(
          db.raw('COUNT(id) as total'),
          db.raw('SUM(CASE WHEN event_value > 0 THEN 1 ELSE 0 END) as accepted')
        )
        .first();

      const reportCount = Number((reportAgg as any)?.total || 0);
      const adoptionTotal = Number((adoptionAgg as any)?.total || 0);
      const adoptionAccepted = Number((adoptionAgg as any)?.accepted || 0);
      const adoptionRate = adoptionTotal > 0 ? Number((adoptionAccepted / adoptionTotal).toFixed(4)) : 0;

      const quality = this.computeQualityFields({ ...row, report_count: reportCount, adoption_rate: adoptionRate });
      await db('user_recipes').where({ id: row.id }).update({
        ...quality,
        report_count: reportCount,
        adoption_rate: adoptionRate,
        updated_at: db.fn.now(),
      });
      affected += 1;
    }
    return { affected };
  }

  async listRecommendPool(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [countResult] = await db('user_recipes')
      .where({ is_active: true, status: 'published', in_recommend_pool: true })
      .count('id as total');

    const total = Number((countResult as any)?.total || 0);
    const rows = await db('user_recipes')
      .where({ is_active: true, status: 'published', in_recommend_pool: true })
      .orderBy('quality_score', 'desc')
      .offset(offset)
      .limit(limit);

    return { total, page, limit, items: rows.map((r: any) => this.parseRecipe(r)) };
  }


  async listForAdmin(status: 'pending' | 'rejected' | 'published', page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [countResult] = await db('user_recipes')
      .where({ is_active: true, status })
      .count('id as total');

    const total = Number((countResult as any)?.total || 0);
    const rows = await db('user_recipes')
      .where({ is_active: true, status })
      .orderBy(status === 'pending' ? 'submitted_at' : 'updated_at', 'desc')
      .offset(offset)
      .limit(limit);

    return { total, page, limit, items: rows.map((r: any) => this.parseRecipe(r)) };
  }

  async batchReview(recipes: string[], action: 'published' | 'rejected', note?: string) {
    const ids = (recipes || []).filter(Boolean);
    if (ids.length === 0) throw new Error('请至少选择一条待审核内容');

    let affected = 0;
    const failures: Array<{ id: string; reason: string }> = [];

    for (const id of ids) {
      try {
        await this.reviewRecipe(id, action, note);
        affected += 1;
      } catch (error: any) {
        failures.push({ id, reason: error?.message || '审核失败' });
      }
    }

    return { affected, failures, action, note: note || null };
  }

  async recordQualityEvent(input: {
    recipeId: string;
    eventType: 'report' | 'adoption';
    eventValue?: number;
    actorUserId?: string;
    payload?: any;
  }) {
    const recipe = await db('user_recipes').where({ id: input.recipeId, is_active: true }).first();
    if (!recipe) throw new Error('菜谱不存在');

    await db('ugc_quality_events').insert({
      user_recipe_id: input.recipeId,
      actor_user_id: input.actorUserId || null,
      event_type: input.eventType,
      event_value: typeof input.eventValue === 'number' ? input.eventValue : (input.eventType === 'report' ? 1 : 0),
      payload: JSON.stringify(input.payload || {}),
      created_at: db.fn.now(),
    });

    await this.recomputeQualityScores([input.recipeId]);
    const updated = await db('user_recipes').where({ id: input.recipeId }).first();
    return this.parseRecipe(updated);
  }

  async deleteUserRecipe(userId: string, recipeId: string) {
    const affected = await db('user_recipes')
      .where('id', recipeId)
      .where('user_id', userId)
      .update({ is_active: false, updated_at: db.fn.now() });

    if (affected === 0) throw new Error('菜谱不存在');
  }

  private computeQualityFields(raw: any) {
    const score = this.calculateQualityScore(raw);
    const inPool = this.shouldEnterRecommendPool(raw, score);
    return { quality_score: score, in_recommend_pool: inPool };
  }

  private calculateQualityScore(raw: any) {
    const recipe = this.parseRecipe({ ...raw });
    const risk = this.riskService.evaluate(recipe);

    let completeness = 0;
    if ((recipe.name || '').trim().length >= 4) completeness += 6;
    if ((recipe.adult_version?.ingredients || []).length >= 2) completeness += 7;
    if ((recipe.baby_version?.ingredients || []).length >= 2) completeness += 7;
    if ((recipe.baby_age_range || '').trim().length > 0) completeness += 5;

    let safety = 35;
    const blockHits = risk.riskHits.filter((h) => h.level === 'block');
    const warnHits = risk.riskHits.filter((h) => h.level === 'warn');
    if (blockHits.length > 0) safety = 0;
    else if (warnHits.length > 0) safety = Math.max(5, 35 - warnHits.length * 6);

    let executable = 0;
    const prep = Number(recipe.prep_time || 0);
    if (prep >= 10 && prep <= 40) executable += 8;
    if ((recipe.step_branches || []).length > 0) executable += 8;
    if (recipe.difficulty && recipe.servings) executable += 9;

    const reportCount = Number(recipe.report_count || 0);
    const adoptionRate = Math.max(0, Math.min(1, Number(recipe.adoption_rate || 0)));
    let feedback = 0;
    if (reportCount === 0) feedback += 8;
    feedback += Math.round(adoptionRate * 7);

    return Math.max(0, Math.min(100, completeness + safety + executable + feedback));
  }

  private shouldEnterRecommendPool(raw: any, score: number) {
    const recipe = this.parseRecipe({ ...raw });
    const risk = this.riskService.evaluate(recipe);
    const hasBlockRisk = risk.riskHits.some((h) => h.level === 'block');
    const reportCount = Number(recipe.report_count || 0);
    const adoptionRate = Number(recipe.adoption_rate || 0);

    if (recipe.status !== 'published') return false;
    if (!recipe.is_active && typeof recipe.is_active !== 'undefined') return false;
    if (hasBlockRisk) return false;
    if (reportCount >= 3) return false;
    if (adoptionRate < 0.08) return false;
    if (adoptionRate < 0.15) return false;

    return score >= RECOMMEND_POOL_THRESHOLD;
  }

  private normalizePayload(payload: any) {
    const {
      name, source, type, prep_time, difficulty, servings,
      ingredients, steps,
      cooking_tips, image_url, tags, category,
      adult_version, baby_version,
      baby_age_range, allergens, is_one_pot, step_branches,
    } = payload || {};

    let adultVersion = adult_version;
    if (!adultVersion && (ingredients || steps)) {
      adultVersion = {
        ingredients: (ingredients || []).map((ing: string) => ({ name: String(ing || '').trim(), amount: '' })),
        steps: (steps || []).map((step: string, i: number) => ({ step: i + 1, action: String(step || '').trim(), time: 0 })),
        seasonings: [],
      };
    }

    return {
      source: source || 'ugc',
      name: name || '未命名投稿',
      type: type || null,
      prep_time: prep_time || null,
      difficulty: difficulty || null,
      servings: servings || null,
      adult_version: adultVersion ? JSON.stringify(adultVersion) : null,
      baby_version: baby_version ? JSON.stringify(baby_version) : null,
      cooking_tips: cooking_tips ? JSON.stringify(cooking_tips) : null,
      image_url: image_url ? JSON.stringify(image_url) : null,
      tags: tags ? JSON.stringify(tags) : null,
      category: category ? JSON.stringify(category) : null,
      baby_age_range: baby_age_range || null,
      allergens: allergens ? JSON.stringify(allergens) : JSON.stringify([]),
      is_one_pot: typeof is_one_pot === 'boolean' ? is_one_pot : null,
      step_branches: step_branches ? JSON.stringify(step_branches) : JSON.stringify([]),
      original_data: JSON.stringify(payload || {}),
    };
  }

  private parseRecipe(recipe: any) {
    if (!recipe) return recipe;
    for (const field of JSON_FIELDS) {
      if (recipe[field] && typeof recipe[field] === 'string') {
        try { recipe[field] = JSON.parse(recipe[field]); } catch {}
      }
    }
    if (!Array.isArray(recipe.allergens)) recipe.allergens = [];
    if (!Array.isArray(recipe.step_branches)) recipe.step_branches = [];
    if (typeof recipe.baby_age_range === 'undefined') recipe.baby_age_range = null;
    if (typeof recipe.is_one_pot === 'undefined') recipe.is_one_pot = null;
    if (typeof recipe.is_favorited !== 'boolean') recipe.is_favorited = Boolean(recipe.is_favorited);
    if (typeof recipe.quality_score !== 'number') recipe.quality_score = Number(recipe.quality_score || 0);
    recipe.in_recommend_pool = Boolean(recipe.in_recommend_pool);
    const risk = this.riskService.evaluate(recipe);
    recipe.risk_hits = risk.riskHits;
    return recipe;
  }
}
