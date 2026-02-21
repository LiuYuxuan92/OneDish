import { db } from '../config/database';

export interface BabyStage {
  stage: string;
  name: string;
  age_range: string;
  age_min: number;
  age_max: number;
  can_eat: string[];
  cannot_eat: string[];
  texture_desc: string;
  meal_frequency: string;
  key_nutrients: string[];
  guide_tips: string[];
}

export class BabyStageService {
  private parse(row: any): BabyStage {
    return {
      ...row,
      can_eat: typeof row.can_eat === 'string' ? JSON.parse(row.can_eat) : row.can_eat,
      cannot_eat: typeof row.cannot_eat === 'string' ? JSON.parse(row.cannot_eat) : row.cannot_eat,
      key_nutrients: typeof row.key_nutrients === 'string' ? JSON.parse(row.key_nutrients) : row.key_nutrients,
      guide_tips: typeof row.guide_tips === 'string' ? JSON.parse(row.guide_tips) : row.guide_tips,
    };
  }

  async getAll(): Promise<BabyStage[]> {
    const rows = await db('baby_stages').orderBy('age_min', 'asc');
    return rows.map(r => this.parse(r));
  }

  async getByStage(stage: string): Promise<BabyStage | null> {
    const row = await db('baby_stages').where('stage', stage).first();
    return row ? this.parse(row) : null;
  }

  async getByAge(months: number): Promise<BabyStage | null> {
    const row = await db('baby_stages')
      .where('age_min', '<=', months)
      .where('age_max', '>', months)
      .first();
    return row ? this.parse(row) : null;
  }

  async getRecipesByStage(stage: string, filters: {
    first_intro?: boolean;
    scene_tag?: string;
    nutrient?: string;
    limit?: number;
  } = {}): Promise<any[]> {
    let query = db('recipes')
      .where('stage', stage)
      .where('is_active', true)
      .select('id', 'name', 'prep_time', 'difficulty', 'stage', 'first_intro',
              'key_nutrients', 'scene_tags', 'texture_level', 'image_url', 'type');

    if (filters.first_intro) {
      query = query.where('first_intro', true);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const rows = await query;

    return rows
      .map(r => ({
        ...r,
        key_nutrients: typeof r.key_nutrients === 'string' ? JSON.parse(r.key_nutrients) : r.key_nutrients || [],
        scene_tags: typeof r.scene_tags === 'string' ? JSON.parse(r.scene_tags) : r.scene_tags || [],
        image_url: typeof r.image_url === 'string' ? JSON.parse(r.image_url) : r.image_url || [],
      }))
      .filter(r => {
        if (filters.scene_tag && !r.scene_tags.includes(filters.scene_tag)) return false;
        if (filters.nutrient && !r.key_nutrients.includes(filters.nutrient)) return false;
        return true;
      });
  }
}
