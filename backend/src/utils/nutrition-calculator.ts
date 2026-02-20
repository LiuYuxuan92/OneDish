/**
 * 营养计算引擎
 * 计算宝宝食谱的营养成分和日推荐量占比
 */

import { BabyNutritionInfo, IngredientItem, BabyStage } from '../types';
import { getStageByAge } from './recipe-pairing-engine';

// ============================================
// 食材营养数据库（每100g含量）
// ============================================

interface NutritionData {
  calories: number;    // kcal
  protein: number;    // g
  carbs: number;      // g
  fat: number;         // g
  fiber: number;       // g
  vitamin_a: number;   // μg
  vitamin_c: number;  // mg
  calcium: number;    // mg
  iron: number;        // mg
  zinc: number;        // mg
}

const NUTRITION_DB: Record<string, NutritionData> = {
  // 肉类
  '鸡胸肉': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, vitamin_a: 21, vitamin_c: 0, calcium: 15, iron: 1, zinc: 1 },
  '鸡腿肉': { calories: 209, protein: 26, carbs: 0, fat: 10.9, fiber: 0, vitamin_a: 48, vitamin_c: 0, calcium: 9, iron: 1.2, zinc: 2.3 },
  '猪肉': { calories: 143, protein: 27, carbs: 0, fat: 3.5, fiber: 0, vitamin_a: 0, vitamin_c: 0, calcium: 6, iron: 1, zinc: 2.3 },
  '猪里脊': { calories: 143, protein: 26, carbs: 0, fat: 3.5, fiber: 0, vitamin_a: 0, vitamin_c: 0, calcium: 6, iron: 1, zinc: 2.3 },
  '排骨': { calories: 278, protein: 24, carbs: 0, fat: 20, fiber: 0, vitamin_a: 10, vitamin_c: 0, calcium: 30, iron: 1.5, zinc: 3.5 },
  '牛肉': { calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0, vitamin_a: 7, vitamin_c: 0, calcium: 8, iron: 2.6, zinc: 5.4 },
  '牛里脊': { calories: 217, protein: 28, carbs: 0, fat: 10, fiber: 0, vitamin_a: 5, vitamin_c: 0, calcium: 5, iron: 2.3, zinc: 4.8 },

  // 鱼类
  '三文鱼': { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, vitamin_a: 50, vitamin_c: 0, calcium: 12, iron: 0.8, zinc: 0.6 },
  '鳕鱼': { calories: 82, protein: 18, carbs: 0, fat: 0.7, fiber: 0, vitamin_a: 32, vitamin_c: 0, calcium: 42, iron: 0.5, zinc: 0.5 },
  '龙利鱼': { calories: 83, protein: 18, carbs: 0, fat: 0.9, fiber: 0, vitamin_a: 28, vitamin_c: 0, calcium: 38, iron: 0.4, zinc: 0.5 },
  '鲈鱼': { calories: 105, protein: 19, carbs: 0, fat: 2.5, fiber: 0, vitamin_a: 25, vitamin_c: 0, calcium: 13, iron: 0.5, zinc: 0.6 },
  '虾仁': { calories: 99, protein: 24, carbs: 0.2, fat: 0.2, fiber: 0, vitamin_a: 54, vitamin_c: 0, calcium: 64, iron: 1.7, zinc: 1.3 },

  // 蔬菜
  '胡萝卜': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, vitamin_a: 835, vitamin_c: 6, calcium: 32, iron: 0.3, zinc: 0.2 },
  '南瓜': { calories: 26, protein: 1, carbs: 6.5, fat: 0.1, fiber: 0.5, vitamin_a: 426, vitamin_c: 9, calcium: 16, iron: 0.4, zinc: 0.3 },
  '土豆': { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, vitamin_a: 5, vitamin_c: 20, calcium: 12, iron: 0.8, zinc: 0.3 },
  '西兰花': { calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6, vitamin_a: 623, vitamin_c: 89, calcium: 47, iron: 0.7, zinc: 0.4 },
  '菠菜': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, vitamin_a: 469, vitamin_c: 28, calcium: 99, iron: 2.7, zinc: 0.5 },
  '番茄': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, vitamin_a: 42, vitamin_c: 14, calcium: 10, iron: 0.3, zinc: 0.2 },
  '豆腐': { calories: 76, protein: 8, carbs: 1.9, fat: 3.7, fiber: 0.3, vitamin_a: 0, vitamin_c: 0, calcium: 350, iron: 1.2, zinc: 0.8 },
  '香菇': { calories: 34, protein: 2.2, carbs: 6.8, fat: 0.3, fiber: 2.5, vitamin_a: 3, vitamin_c: 1, calcium: 2, iron: 0.3, zinc: 0.4 },
  '白菜': { calories: 17, protein: 1.5, carbs: 3.2, fat: 0.1, fiber: 1, vitamin_a: 20, vitamin_c: 31, calcium: 50, iron: 0.3, zinc: 0.2 },
  '青菜': { calories: 15, protein: 1.5, carbs: 2.6, fat: 0.3, fiber: 1, vitamin_a: 309, vitamin_c: 45, calcium: 108, iron: 1.2, zinc: 0.3 },
  '娃娃菜': { calories: 13, protein: 1.1, carbs: 2.4, fat: 0.1, fiber: 1, vitamin_a: 10, vitamin_c: 12, calcium: 26, iron: 0.3, zinc: 0.2 },

  // 谷物
  '大米': { calories: 130, protein: 2.6, carbs: 28, fat: 0.3, fiber: 0.3, vitamin_a: 0, vitamin_c: 0, calcium: 7, iron: 0.3, zinc: 0.5 },
  '小米': { calories: 120, protein: 2.5, carbs: 26, fat: 0.6, fiber: 0.8, vitamin_a: 10, vitamin_c: 0, calcium: 9, iron: 0.5, zinc: 0.7 },
  '面条': { calories: 109, protein: 3.2, carbs: 22, fat: 0.2, fiber: 0.5, vitamin_a: 0, vitamin_c: 0, calcium: 7, iron: 0.4, zinc: 0.3 },
  '婴儿面条': { calories: 109, protein: 3.2, carbs: 22, fat: 0.2, fiber: 0.5, vitamin_a: 0, vitamin_c: 0, calcium: 20, iron: 2.5, zinc: 0.5 },
  '粥': { calories: 46, protein: 1.1, carbs: 9.8, fat: 0.3, fiber: 0.2, vitamin_a: 0, vitamin_c: 0, calcium: 4, iron: 0.2, zinc: 0.2 },

  // 蛋类
  '鸡蛋': { calories: 143, protein: 13, carbs: 1.1, fat: 9.5, fiber: 0, vitamin_a: 540, vitamin_c: 0, calcium: 40, iron: 1.2, zinc: 1 },
  '蛋黄': { calories: 322, protein: 15, carbs: 3.6, fat: 27, fiber: 0, vitamin_a: 1442, vitamin_c: 0, calcium: 129, iron: 2.5, zinc: 2.3 },

  // 奶制品
  '牛奶': { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0, vitamin_a: 46, vitamin_c: 1, calcium: 113, iron: 0, zinc: 0.4 },
  '酸奶': { calories: 72, protein: 2.5, carbs: 9.3, fat: 2.7, fiber: 0, vitamin_a: 2, vitamin_c: 1, calcium: 118, iron: 0, zinc: 0.4 },

  // 水果
  '苹果': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, vitamin_a: 3, vitamin_c: 4, calcium: 6, iron: 0.1, zinc: 0 },
  '香蕉': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, vitamin_a: 3, vitamin_c: 9, calcium: 5, iron: 0.3, zinc: 0.2 },
  '梨': { calories: 50, protein: 0.4, carbs: 13, fat: 0.1, fiber: 3.1, vitamin_a: 1, vitamin_c: 4, calcium: 9, iron: 0.2, zinc: 0.1 },
  '橙子': { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, vitamin_a: 11, vitamin_c: 53, calcium: 40, iron: 0.1, zinc: 0.1 },
};

// ============================================
// 月龄营养推荐摄入量(RDA)
// ============================================

const NUTRITION_RDA: Record<BabyStage, { calories: number; protein: number; vitamin_a: number; vitamin_c: number; calcium: number; iron: number; zinc: number }> = {
  [BabyStage.EARLY]: { calories: 600, protein: 15, vitamin_a: 350, vitamin_c: 25, calcium: 260, iron: 10, zinc: 3 },
  [BabyStage.EARLY_MID]: { calories: 700, protein: 15, vitamin_a: 400, vitamin_c: 30, calcium: 400, iron: 10, zinc: 3 },
  [BabyStage.MID]: { calories: 800, protein: 20, vitamin_a: 400, vitamin_c: 35, calcium: 500, iron: 9, zinc: 3 },
  [BabyStage.LATE]: { calories: 1000, protein: 20, vitamin_a: 400, vitamin_c: 40, calcium: 600, iron: 7, zinc: 3 },
  [BabyStage.TODDLER_EARLY]: { calories: 1100, protein: 20, vitamin_a: 400, vitamin_c: 40, calcium: 600, iron: 7, zinc: 3 },
  [BabyStage.TODDLER]: { calories: 1200, protein: 25, vitamin_a: 400, vitamin_c: 45, calcium: 700, iron: 6, zinc: 4 },
};

// ============================================
// 营养计算器类
// ============================================

export class NutritionCalculator {
  /**
   * 计算宝宝食谱营养值
   */
  static calculate(ingredients: IngredientItem[], ageMonths: number): BabyNutritionInfo {
    const stage = getStageByAge(ageMonths);
    const rda = NUTRITION_RDA[stage];

    let total: NutritionData = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      vitamin_a: 0,
      vitamin_c: 0,
      calcium: 0,
      iron: 0,
      zinc: 0,
    };

    // 累加每种食材的营养
    for (const ing of ingredients) {
      const amount = this.parseAmount(ing.amount);
      const nutrition = this.findNutrition(ing.name);
      if (nutrition) {
        const ratio = amount / 100;
        total.calories += nutrition.calories * ratio;
        total.protein += nutrition.protein * ratio;
        total.carbs += nutrition.carbs * ratio;
        total.fat += nutrition.fat * ratio;
        total.fiber += nutrition.fiber * ratio;
        total.vitamin_a += nutrition.vitamin_a * ratio;
        total.vitamin_c += nutrition.vitamin_c * ratio;
        total.calcium += nutrition.calcium * ratio;
        total.iron += nutrition.iron * ratio;
        total.zinc += nutrition.zinc * ratio;
      }
    }

    // 计算占日推荐量百分比
    const daily_percentage = {
      calories: Math.round((total.calories / rda.calories) * 100),
      protein: Math.round((total.protein / rda.protein) * 100),
      vitamin_a: Math.round((total.vitamin_a / rda.vitamin_a) * 100),
      vitamin_c: Math.round((total.vitamin_c / rda.vitamin_c) * 100),
      calcium: Math.round((total.calcium / rda.calcium) * 100),
      iron: Math.round((total.iron / rda.iron) * 100),
      zinc: Math.round((total.zinc / rda.zinc) * 100),
    };

    // 判断适合度
    const suitability = this.calculateSuitability(daily_percentage);

    // 生成备注
    const notes = this.generateNotes(daily_percentage, ingredients);

    return {
      nutrients: {
        calories: Math.round(total.calories * 10) / 10,
        protein: Math.round(total.protein * 10) / 10,
        carbs: Math.round(total.carbs * 10) / 10,
        fat: Math.round(total.fat * 10) / 10,
        fiber: Math.round(total.fiber * 10) / 10,
        vitamin_a: Math.round(total.vitamin_a * 10) / 10,
        vitamin_c: Math.round(total.vitamin_c * 10) / 10,
        calcium: Math.round(total.calcium * 10) / 10,
        iron: Math.round(total.iron * 10) / 10,
        zinc: Math.round(total.zinc * 10) / 10,
      },
      daily_percentage,
      suitability,
      notes,
    };
  }

  /**
   * 解析食材用量
   */
  private static parseAmount(amount: string): number {
    // 提取数字
    const match = amount.match(/[\d.]+/);
    if (!match) return 0;

    const num = parseFloat(match[0]);

    // 单位转换
    if (amount.includes('kg')) return num * 1000;
    if (amount.includes('两')) return num * 50;
    if (amount.includes('勺')) return num * 10;
    if (amount.includes('碗')) return num * 200;
    if (amount.includes('杯')) return num * 150;
    if (amount.includes('个')) return num * 50; // 假设一个鸡蛋约50g

    return num; // 默认g
  }

  /**
   * 查找食材营养数据
   */
  private static findNutrition(ingredientName: string): NutritionData | undefined {
    // 精确匹配
    if (NUTRITION_DB[ingredientName]) {
      return NUTRITION_DB[ingredientName];
    }

    // 模糊匹配
    for (const key of Object.keys(NUTRITION_DB)) {
      if (ingredientName.includes(key) || key.includes(ingredientName)) {
        return NUTRITION_DB[key];
      }
    }

    return undefined;
  }

  /**
   * 计算适合度
   */
  private static calculateSuitability(percentage: Record<string, number>): 'fully_suitable' | 'partial' | 'not_suitable' {
    const values = Object.values(percentage);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    if (avg >= 20 && avg <= 80) return 'fully_suitable';
    if (avg >= 10 && avg <= 100) return 'partial';
    return 'not_suitable';
  }

  /**
   * 生成备注
   */
  private static generateNotes(percentage: Record<string, number>, ingredients: IngredientItem[]): string {
    const notes: string[] = [];

    // 热量提示
    if (percentage.calories < 20) {
      notes.push('热量较低，建议搭配主食');
    } else if (percentage.calories > 80) {
      notes.push('热量较高，注意控制用量');
    }

    // 蛋白质提示
    if (percentage.protein >= 50) {
      notes.push('富含优质蛋白质');
    }

    // 铁质提示
    if (percentage.iron < 30) {
      notes.push('铁含量较低，可搭配富铁食材');
    }

    // 钙质提示
    if (percentage.calcium < 30) {
      notes.push('建议搭配奶制品或豆制品补钙');
    }

    return notes.length > 0 ? notes.join('；') : '营养均衡';
  }

  /**
   * 获取营养建议
   */
  static getSuggestions(ageMonths: number): string[] {
    const stage = getStageByAge(ageMonths);
    const suggestions: string[] = [];

    switch (stage) {
      case BabyStage.EARLY:
        suggestions.push('以高铁米粉为主', '逐样添加新食材', '细腻泥状');
        break;
      case BabyStage.EARLY_MID:
        suggestions.push('可添加蛋白质食物', '尝试混合食材', '稍粗泥状');
        break;
      case BabyStage.MID:
        suggestions.push('增加食物种类', '锻炼咀嚼能力', '碎末状');
        break;
      case BabyStage.LATE:
        suggestions.push('可以吃软烂成人食物', '少盐少糖', '小颗粒');
        break;
      case BabyStage.TODDLER_EARLY:
        suggestions.push('培养自主进食', '每日3餐2点', '小块');
        break;
      case BabyStage.TODDLER:
        suggestions.push('与家人共餐', '注意营养均衡', '小块');
        break;
    }

    return suggestions;
  }
}

export default NutritionCalculator;
