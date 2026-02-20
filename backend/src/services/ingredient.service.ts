import { db } from '../config/database';

export class IngredientService {
  // 获取食材列表
  async getIngredients(params: {
    category?: string;
    keyword?: string;
  }) {
    const { category, keyword } = params;

    let query = db('ingredients')
      .select('*')
      .orderBy('category')
      .orderBy('name');

    if (category) {
      query = query.where('category', category);
    }

    if (keyword) {
      query = query.where('name', 'ilike', `%${keyword}%`);
    }

    const items = await query;

    return { items };
  }
}
