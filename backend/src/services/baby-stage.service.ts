import { db } from '../config/database';
import { cosService } from './cos.service';

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
  private parseJsonArray(value: unknown): any[] {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private resolveRecipeImageList(value: unknown): string[] {
    return this.parseJsonArray(value)
      .map((item) => cosService.resolveStoredUrl(typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean) as string[];
  }

  private parse(row: any): BabyStage {
    return {
      ...row,
      can_eat: this.parseJsonArray(row.can_eat),
      cannot_eat: this.parseJsonArray(row.cannot_eat),
      key_nutrients: this.parseJsonArray(row.key_nutrients),
      guide_tips: this.parseJsonArray(row.guide_tips),
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
        key_nutrients: this.parseJsonArray(r.key_nutrients),
        scene_tags: this.parseJsonArray(r.scene_tags),
        image_url: this.resolveRecipeImageList(r.image_url),
      }))
      .filter(r => {
        if (filters.scene_tag && !r.scene_tags.includes(filters.scene_tag)) return false;
        if (filters.nutrient && !r.key_nutrients.includes(filters.nutrient)) return false;
        return true;
      });
  }
}
