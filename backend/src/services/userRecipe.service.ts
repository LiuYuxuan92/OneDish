import { db } from '../config/database';

const JSON_FIELDS = ['original_data', 'adult_version', 'baby_version', 'cooking_tips', 'image_url', 'tags', 'category', 'allergens', 'step_branches'];

export class UserRecipeService {
  async createDraft(userId: string, payload: any) {
    return this.upsertDraft(userId, undefined, payload);
  }

  async upsertDraft(userId: string, recipeId: string | undefined, payload: any) {
    const data = this.normalizePayload(payload);

    if (recipeId) {
      const [updated] = await db('user_recipes')
        .where({ id: recipeId, user_id: userId, is_active: true })
        .update({
          ...data,
          status: 'draft',
          updated_at: db.fn.now(),
        })
        .returning('*');

      if (!updated) throw new Error('菜谱不存在');
      return this.parseRecipe(updated);
    }

    const [created] = await db('user_recipes')
      .insert({
        user_id: userId,
        source: payload?.source || 'ugc',
        ...data,
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

    const safetyResult = this.validateSafety(existing);
    if (!safetyResult.safe) {
      const reason = `内容安全校验未通过：${safetyResult.reasons.join('；')}`;
      await db('user_recipes')
        .where({ id: recipeId })
        .update({ reject_reason: reason, updated_at: db.fn.now() });
      throw new Error(reason);
    }

    const [row] = await db('user_recipes')
      .where({ id: recipeId, user_id: userId, is_active: true })
      .whereIn('status', ['draft', 'rejected'])
      .update({ status: 'pending', submitted_at: db.fn.now(), reject_reason: null, rejected_at: null, updated_at: db.fn.now() })
      .returning('*');

    return this.parseRecipe(row);
  }

  async reviewRecipe(recipeId: string, action: 'published' | 'rejected', reason?: string) {
    const current = await db('user_recipes').where({ id: recipeId, is_active: true, status: 'pending' }).first();
    if (!current) throw new Error('仅待审核内容可处理');

    if (action === 'published') {
      const safetyResult = this.validateSafety(current);
      if (!safetyResult.safe) {
        throw new Error(`内容安全校验未通过：${safetyResult.reasons.join('；')}`);
      }
    }

    const patch: any = {
      status: action,
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

  async deleteUserRecipe(userId: string, recipeId: string) {
    const affected = await db('user_recipes')
      .where('id', recipeId)
      .where('user_id', userId)
      .update({ is_active: false, updated_at: db.fn.now() });

    if (affected === 0) throw new Error('菜谱不存在');
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

  private validateSafety(recipe: any): { safe: boolean; reasons: string[] } {
    const textParts: string[] = [];
    const pushText = (v: any) => {
      if (v == null) return;
      if (typeof v === 'string') textParts.push(v);
      else textParts.push(JSON.stringify(v));
    };

    pushText(recipe.name);
    pushText(recipe.cooking_tips);
    pushText(recipe.tags);
    pushText(recipe.adult_version);
    pushText(recipe.baby_version);

    const plainText = textParts.join(' ').toLowerCase();
    const riskRules: Array<{ words: string[]; reason: string }> = [
      { words: ['蜂蜜'], reason: '1岁以下婴幼儿禁用蜂蜜' },
      { words: ['整颗坚果', '整粒坚果', '整颗花生', '整粒花生'], reason: '整颗/整粒坚果存在窒息风险' },
      { words: ['酒精', '白酒', '啤酒', '料酒', '黄酒', '葡萄酒'], reason: '婴幼儿喂养不应含酒精相关食材' },
      { words: ['高盐', '重盐', '高糖', '重糖', '加糖', '盐焗'], reason: '婴幼儿饮食应避免高盐高糖' },
    ];

    const reasons = riskRules
      .filter((rule) => rule.words.some((w) => plainText.includes(w.toLowerCase())))
      .map((r) => r.reason);

    return { safe: reasons.length === 0, reasons };
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
    return recipe;
  }
}
