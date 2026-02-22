/**
 * "一菜两吃"智能配对引擎 V2
 * 基于成人菜谱自动生成宝宝版
 * 支持6个精细月龄阶段
 */

import { generateUUID } from '../config/database';
import { BabyStage, IngredientAgeMap, CookingMethodAgeAdapter, SeasoningAgeRule } from '../types';

// ============================================
// 食材-月龄映射表（扩展版）
// ============================================

export const INGREDIENT_AGE_MAP: Record<string, IngredientAgeMap> = {
  // 肉类
  '鸡胸肉': { minAge: 6, form: '泥', allergen: false },
  '鸡腿肉': { minAge: 8, form: '碎', allergen: false },
  '猪里脊': { minAge: 6, form: '泥', allergen: false },
  '排骨': { minAge: 9, form: '碎', allergen: false },
  '牛肉': { minAge: 8, form: '泥', allergen: false },
  '三文鱼': { minAge: 8, form: '泥', allergen: true },
  '鳕鱼': { minAge: 8, form: '泥', allergen: true },
  '龙利鱼': { minAge: 8, form: '泥', allergen: true },
  '虾仁': { minAge: 8, form: '泥', allergen: true },

  // 蔬菜
  '胡萝卜': { minAge: 6, form: '泥', allergen: false },
  '南瓜': { minAge: 6, form: '泥', allergen: false },
  '土豆': { minAge: 6, form: '泥', allergen: false },
  '西兰花': { minAge: 6, form: '泥', allergen: false },
  '菠菜': { minAge: 6, form: '泥', allergen: false },
  '番茄': { minAge: 8, form: '泥', allergen: false },
  '豆腐': { minAge: 8, form: '泥', allergen: false },
  '香菇': { minAge: 8, form: '泥', allergen: false },

  // 过敏原
  '鸡蛋': { minAge: 8, form: '泥', allergen: true },
  '牛奶': { minAge: 12, form: '液体', allergen: true },
  '花生': { minAge: 12, form: '酱', allergen: true },
  '面粉': { minAge: 8, form: '泥', allergen: true },
};

// ============================================
// 烹饪方式-月龄适配
// ============================================

export const COOKING_METHOD_BY_AGE: Record<string, CookingMethodAgeAdapter> = {
  '6-8m': { preferred: ['蒸', '煮'], avoid: ['炒', '煎', '炸'] },
  '8-10m': { preferred: ['蒸', '煮', '快炒'], avoid: ['炸', '煎'] },
  '10-12m': { preferred: ['蒸', '煮', '炒', '煎(少油)'], avoid: ['炸'] },
  '12-18m': { preferred: ['蒸', '煮', '炒', '煎'], avoid: ['炸'] },
  '18-24m': { preferred: ['蒸', '煮', '炒', '煎', '烤'], avoid: [] },
  '24-36m': { preferred: ['蒸', '煮', '炒', '煎', '烤', '炖'], avoid: [] },
};

// ============================================
// 调料-月龄规则
// ============================================

export const SEASONING_BY_AGE: Record<string, SeasoningAgeRule> = {
  '6-8m': { allowed: [], maxSodium: 0 },
  '8-10m': { allowed: [], maxSodium: 0 },
  '10-12m': { allowed: ['宝宝酱油(低钠)'], maxSodium: 200 },
  '12-18m': { allowed: ['宝宝酱油', '少量盐'], maxSodium: 300 },
  '18-24m': { allowed: ['宝宝酱油', '盐(极少量)'], maxSodium: 400 },
  '24-36m': { allowed: ['酱油', '盐(少量)'], maxSodium: 500 },
};

export const FORBIDDEN_SEASONINGS = ['料酒', '味精', '鸡精', '辣椒', '花椒', '五香粉'];

// ============================================
// 月龄阶段配置
// ============================================

export const BABY_STAGE_CONFIG: Record<BabyStage, { label: string; range: string; texture: string; note: string }> = {
  [BabyStage.EARLY]: { label: '辅食初期', range: '6-8个月', texture: '细腻泥状', note: '无颗粒，流动性好' },
  [BabyStage.EARLY_MID]: { label: '辅食早期', range: '8-10个月', texture: '稍粗泥状', note: '可有小颗粒' },
  [BabyStage.MID]: { label: '辅食中期', range: '10-12个月', texture: '碎末状', note: '软烂小颗粒' },
  [BabyStage.LATE]: { label: '辅食后期', range: '12-18个月', texture: '小颗粒', note: '可咀嚼的软烂颗粒' },
  [BabyStage.TODDLER_EARLY]: { label: '幼儿早期', range: '18-24个月', texture: '小块', note: '约1cm大小软块' },
  [BabyStage.TODDLER]: { label: '幼儿期', range: '24-36个月', texture: '小块', note: '约2cm大小，稍软' },
};

// ============================================
// 工具函数
// ============================================

/**
 * 根据月龄获取阶段
 */
export const getStageByAge = (ageMonths: number): BabyStage => {
  if (ageMonths < 8) return BabyStage.EARLY;
  if (ageMonths < 10) return BabyStage.EARLY_MID;
  if (ageMonths < 12) return BabyStage.MID;
  if (ageMonths < 18) return BabyStage.LATE;
  if (ageMonths < 24) return BabyStage.TODDLER_EARLY;
  return BabyStage.TODDLER;
};

/**
 * 根据月龄获取阶段配置
 */
export const getStageConfig = (ageMonths: number) => {
  const stage = getStageByAge(ageMonths);
  return BABY_STAGE_CONFIG[stage];
};

/**
 * 获取适合月龄的烹饪方式
 */
export const getPreferredCookingMethods = (ageMonths: number): string[] => {
  const stageKey = getStageByAge(ageMonths);
  return COOKING_METHOD_BY_AGE[stageKey]?.preferred || ['蒸', '煮'];
};

/**
 * 获取月龄应避免的烹饪方式
 */
export const getAvoidedCookingMethods = (ageMonths: number): string[] => {
  const stageKey = getStageByAge(ageMonths);
  return COOKING_METHOD_BY_AGE[stageKey]?.avoid || [];
};

/**
 * 检查食材是否适合某月龄
 */
export const isIngredientSuitable = (ingredientName: string, ageMonths: number): { suitable: boolean; form?: string; allergen?: boolean; reason?: string; minAge?: number } => {
  const mapping = INGREDIENT_AGE_MAP[ingredientName];
  if (!mapping) {
    return { suitable: true, reason: '未知食材，请确认' };
  }
  if (ageMonths < mapping.minAge) {
    return { suitable: false, form: mapping.form, allergen: mapping.allergen, reason: `需要${mapping.minAge}个月以上`, minAge: mapping.minAge };
  }
  return { suitable: true, form: mapping.form, allergen: mapping.allergen, minAge: mapping.minAge };
};

/**
 * 检查调料是否允许
 */
export const isSeasoningAllowed = (seasoningName: string, ageMonths: number): { allowed: boolean;替代方案?: string; reason?: string } => {
  if (FORBIDDEN_SEASONINGS.includes(seasoningName)) {
    return { allowed: false,替代方案: '不使用', reason: `${seasoningName}对宝宝有刺激性` };
  }

  const stageKey = getStageByAge(ageMonths);
  const rule = SEASONING_BY_AGE[stageKey];
  if (!rule) {
    return { allowed: true };
  }

  if (rule.allowed.length === 0) {
    return { allowed: false, reason: '此阶段不建议添加任何调料' };
  }

  const isAllowed = rule.allowed.some(a => seasoningName.includes(a.replace('宝宝', '')));
  if (!isAllowed) {
    return { allowed: false,替代方案: rule.allowed[0] || '不使用', reason: '建议使用宝宝专用调料' };
  }

  return { allowed: true };
};

// ========== 食材适配映射 ==========
export const INGREDIENT_MAPPING = {
  // 肉类
  meat: {
    '鸡胸肉': { baby: '鸡胸肉泥', processing: '去筋膜打泥', minAge: 6 },
    '鸡腿': { baby: '鸡腿肉', processing: '去骨去皮', minAge: 8 },
    '鸡翅': { baby: '鸡翅肉', processing: '去骨取肉', minAge: 8 },
    '猪肉': { baby: '猪肉泥', processing: '去筋膜打泥', minAge: 6 },
    '排骨': { baby: '排骨肉', processing: '去骨取肉', minAge: 9 },
    '牛肉': { baby: '牛肉泥', processing: '去筋膜打泥', minAge: 8 },
    '牛柳': { baby: '牛柳碎', processing: '切碎', minAge: 12 },
  },
  
  // 鱼类
  seafood: {
    '鲈鱼': { baby: '鲈鱼肉', processing: '去刺取肉', minAge: 10 },
    '鳕鱼': { baby: '鳕鱼肉', processing: '去刺', minAge: 8 },
    '三文鱼': { baby: '三文鱼肉', processing: '去刺', minAge: 8 },
    '龙利鱼': { baby: '龙利鱼肉', processing: '去刺', minAge: 8 },
    '虾仁': { baby: '虾泥', processing: '去虾线打泥', minAge: 8 },
  },
  
  // 蔬菜
  vegetable: {
    '胡萝卜': { baby: '胡萝卜泥/碎', processing: '蒸熟打泥', minAge: 6 },
    '南瓜': { baby: '南瓜泥', processing: '蒸熟打泥', minAge: 6 },
    '土豆': { baby: '土豆泥', processing: '蒸熟打泥', minAge: 6 },
    '西兰花': { baby: '西兰花泥', processing: '取花朵蒸熟', minAge: 6 },
    '菠菜': { baby: '菠菜泥', processing: '焯水去草酸', minAge: 6 },
    '番茄': { baby: '番茄泥', processing: '去皮去籽', minAge: 8 },
    '豆腐': { baby: '豆腐泥', processing: '压碎', minAge: 8 },
  },
  
  // 谷物
  grain: {
    '大米': { baby: '米粥', processing: '熬煮至软烂', minAge: 6 },
    '小米': { baby: '小米粥', processing: '熬煮至软烂', minAge: 6 },
    '面条': { baby: '碎面条', processing: '煮软剪碎', minAge: 8 },
  },
};

// ========== 调味替换规则 ==========
export const SEASONING_RULES = {
  // 成人调料 -> 宝宝替代方案
  '盐': { 
    baby: '不加或极少', 
    note: '1岁以下不加盐，利用食材本味',
    maxAge: 12 
  },
  '酱油': { 
    baby: '宝宝酱油或不加', 
    note: '选择低钠酱油，少量',
    maxAge: 12 
  },
  '料酒': { 
    baby: '姜片/柠檬', 
    note: '绝对不用料酒，用天然食材去腥',
    maxAge: 0 
  },
  '糖': { 
    baby: '不加', 
    note: '利用南瓜、胡萝卜等天然甜味',
    maxAge: 12 
  },
  '味精/鸡精': { 
    baby: '不加', 
    note: '禁用',
    maxAge: 0 
  },
  '辣椒': { 
    baby: '去掉', 
    note: '不做辣味',
    maxAge: 36 
  },
  '花椒': { 
    baby: '去掉', 
    note: '刺激性太强',
    maxAge: 36 
  },
  '八角/桂皮': { 
    baby: '去掉', 
    note: '味道太重',
    maxAge: 24 
  },
};

// ========== 烹饪方式转换 ==========
export const COOKING_METHOD_MAP = {
  // 成人方式 -> 宝宝方式
  '炸': { baby: '蒸/煮', reason: '减少油脂' },
  '煎': { baby: '蒸/煮', reason: '减少油脂' },
  '烤': { baby: '蒸', reason: '保持水分' },
  '爆炒': { baby: '水煮+少量油', reason: '易消化' },
  '红烧': { baby: '清蒸', reason: '少油少盐' },
  '干锅': { baby: '清蒸', reason: '太油腻' },
  '麻辣': { baby: '清蒸', reason: '不辣版' },
  '炒': { baby: '煮/蒸', reason: '软烂易消化' },
  // 适合宝宝的方式保持不变
  '蒸': { baby: '蒸', reason: '最佳方式' },
  '煮': { baby: '煮', reason: '易消化' },
  '炖': { baby: '炖', reason: '软烂' },
  '熬': { baby: '熬', reason: '粥类' },
};

// ========== 营养标签生成 ==========
const NUTRITION_TAGS: Record<string, string> = {
  '鸡肉': '优质蛋白质，促进生长发育',
  '鱼肉': 'DHA和EPA，促进大脑发育',
  '牛肉': '铁和锌，预防贫血',
  '猪肉': '蛋白质和B族维生素',
  '虾': '钙和蛋白质',
  '鸡蛋': '卵磷脂和优质蛋白',
  '豆腐': '植物蛋白和钙质',
  '胡萝卜': 'β-胡萝卜素，保护视力',
  '南瓜': '维生素A和膳食纤维',
  '菠菜': '铁和叶酸',
  '西兰花': '维生素C和膳食纤维',
  '番茄': '番茄红素和维生素C',
  '土豆': '碳水化合物和维生素C',
};

// ========== 年龄段质地要求 ==========
const TEXTURE_BY_AGE: Record<string, { form: string; note: string }> = {
  '6-8m': { form: '细腻泥状', note: '无颗粒，流动性好' },
  '8-10m': { form: '稍粗泥状', note: '可有小颗粒' },
  '10-12m': { form: '碎末状', note: '软烂小颗粒' },
  '12-18m': { form: '小颗粒', note: '可咀嚼的软烂颗粒' },
  '18-24m': { form: '小块', note: '约1cm大小软块' },
  '2-3y': { form: '小块', note: '约2cm大小，稍软' },
};

// ========== 智能配对引擎 ==========
export class RecipePairingEngine {
  
  /**
   * 分析成人菜谱，生成宝宝版
   */
  static generateBabyVersion(adultRecipe: any, targetAge: string = '1-2岁') {
    const { mainIngredients, steps, seasonings, name } = adultRecipe;
    
    // 1. 筛选适合宝宝的食材
    const babyIngredients = this.adaptIngredients(mainIngredients);
    
    // 2. 转换调料
    const babySeasonings = this.adaptSeasonings(seasonings);
    
    // 3. 转换烹饪步骤
    const babySteps = this.adaptSteps(steps, targetAge);
    
    // 4. 生成营养提示
    const nutritionTips = this.generateNutritionTips(babyIngredients);
    
    // 5. 检查过敏原
    const allergyAlert = this.checkAllergens(babyIngredients);
    
    // 6. 生成质地说明
    const textureNote = this.getTextureByAge(targetAge);
    
    return {
      name: `${name}（宝宝版）`,
      age_range: targetAge,
      ingredients: babyIngredients,
      seasonings: babySeasonings,
      steps: babySteps,
      nutrition_tips: nutritionTips,
      allergy_alert: allergyAlert,
      texture_note: textureNote,
    };
  }
  
  /**
   * 食材适配
   */
  private static adaptIngredients(ingredients: any[]) {
    return ingredients.map((ing: any) => {
      const name = ing.name;
      
      // 查找映射
      for (const category of Object.values(INGREDIENT_MAPPING)) {
        if (category[name]) {
          return {
            ...ing,
            name: category[name].baby,
            note: `${ing.note || ''} (${category[name].processing})`,
            amount: this.reduceAmount(ing.amount, 0.25), // 宝宝用量约1/4
          };
        }
      }
      
      // 默认处理
      return {
        ...ing,
        note: ing.note || '',
        amount: this.reduceAmount(ing.amount, 0.25),
      };
    });
  }
  
  /**
   * 调料适配
   */
  private static adaptSeasonings(seasonings: any[]) {
    const adapted: any[] = [];
    
    for (const season of seasonings) {
      const rule = SEASONING_RULES[season.name];
      
      if (rule) {
        // 如果是禁用调料，跳过
        if (rule.maxAge === 0) continue;
        
        // 替换为宝宝版
        adapted.push({
          name: rule.baby,
          amount: '极少量',
          note: rule.note,
        });
      } else {
        // 未明确的调料，默认不加
        continue;
      }
    }
    
    return adapted.length > 0 ? adapted : [{ name: '无', note: '1岁以下不加调料' }];
  }
  
  /**
   * 步骤适配
   */
  private static adaptSteps(steps: any[], targetAge: string) {
    return steps.map((step, index) => {
      let adaptedAction = step.action;
      let note = step.note || '';
      
      // 转换烹饪方式
      for (const [adult, baby] of Object.entries(COOKING_METHOD_MAP)) {
        if (adaptedAction.includes(adult)) {
          adaptedAction = adaptedAction.replace(adult, baby.baby);
          note += ` (${baby.reason})`;
          break;
        }
      }
      
      // 最后一步调整质地
      if (index === steps.length - 1) {
        const texture = this.getTextureByAge(targetAge);
        note += ` 调整至${texture.form}`;
      }
      
      return {
        ...step,
        action: adaptedAction,
        note: note.trim(),
      };
    });
  }
  
  /**
   * 生成营养提示
   */
  static generateNutritionTips(ingredients: any[]) {
    const tips: string[] = [];
    
    for (const ing of ingredients) {
      for (const [food, tip] of Object.entries(NUTRITION_TAGS)) {
        if (ing.name.includes(food)) {
          tips.push(`${ing.name.replace(/泥|碎|末/g, '')}${tip}`);
        }
      }
    }
    
    return tips.length > 0 
      ? tips.join('；') 
      : '提供均衡营养，促进宝宝健康成长';
  }
  
  /**
   * 检查过敏原
   */
  private static checkAllergens(ingredients: any[]) {
    const allergens = ['虾', '蟹', '花生', '核桃', '鸡蛋', '鱼', '牛奶', '大豆'];
    const found: string[] = [];
    
    for (const ing of ingredients) {
      for (const allergen of allergens) {
        if (ing.name.includes(allergen)) {
          found.push(allergen);
        }
      }
    }
    
    if (found.length === 0) return '';
    
    return `含有${found.join('、')}，首次食用需少量尝试，观察有无过敏反应`;
  }
  
  /**
   * 根据年龄获取质地要求
   */
  private static getTextureByAge(age: string) {
    for (const [range, texture] of Object.entries(TEXTURE_BY_AGE)) {
      if (age.includes(range.split('-')[0].replace('m', '')) ||
          age.includes(range.split('-')[0].replace('y', ''))) {
        return texture;
      }
    }
    return { form: '软烂小块', note: '根据宝宝咀嚼能力调整' };
  }
  
  /**
   * 减少用量（用于宝宝版）
   */
  private static reduceAmount(amount: string, ratio: number): string {
    // 简单处理，实际应解析数值
    if (amount.includes('g')) {
      const num = parseInt(amount);
      if (!isNaN(num)) {
        return `${Math.round(num * ratio)}g`;
      }
    }
    if (amount.includes('个')) {
      return amount; // 保持原样
    }
    return `少量${amount}`;
  }
  
  /**
   * 生成同步烹饪建议
   */
  static generateSyncCookingTips(adultSteps: any[], babySteps: any[]) {
    const sharedSteps: number[] = [];
    
    // 查找共用步骤
    for (let i = 0; i < Math.min(adultSteps.length, babySteps.length); i++) {
      if (adultSteps[i].action === babySteps[i].action ||
          this.isSimilarStep(adultSteps[i], babySteps[i])) {
        sharedSteps.push(i);
      }
    }
    
    return {
      can_cook_together: sharedSteps.length > 0,
      shared_steps: sharedSteps,
      time_saving: `共用${sharedSteps.length}个步骤，节省约${sharedSteps.length * 5}分钟`,
      tips: this.generateCookingTips(adultSteps, babySteps),
    };
  }
  
  /**
   * 判断步骤是否相似
   */
  private static isSimilarStep(step1: any, step2: any): boolean {
    const keywords = ['清洗', '焯水', '浸泡', '腌制'];
    return keywords.some(kw => 
      step1.action.includes(kw) && step2.action.includes(kw)
    );
  }
  
  /**
   * 生成烹饪提示
   */
  private static generateCookingTips(adultSteps: any[], babySteps: any[]) {
    const tips: string[] = [];
    
    // 检查是否有蒸制步骤
    const hasSteam = adultSteps.some(s => s.action.includes('蒸')) ||
                     babySteps.some(s => s.action.includes('蒸'));
    if (hasSteam) {
      tips.push('蒸制时可以同锅进行，宝宝食材放上层');
    }
    
    // 检查是否有焯水步骤
    const hasBlanch = adultSteps.some(s => s.action.includes('焯水'));
    if (hasBlanch) {
      tips.push('焯水可以共用一锅水，先焯宝宝食材再焯大人食材');
    }
    
    return tips.join('；');
  }
}

// ========== 批量生成器 ==========
export class BatchRecipeGenerator {
  
  // 核心食材组合模板
  static readonly CORE_COMBINATIONS = [
    // 肉类+蔬菜
    { main: '鸡肉', sub: '胡萝卜', category: 'meat' },
    { main: '鸡肉', sub: '土豆', category: 'meat' },
    { main: '鸡肉', sub: '香菇', category: 'meat' },
    { main: '猪肉', sub: '胡萝卜', category: 'meat' },
    { main: '猪肉', sub: '土豆', category: 'meat' },
    { main: '牛肉', sub: '番茄', category: 'meat' },
    { main: '牛肉', sub: '胡萝卜', category: 'meat' },
    { main: '鱼肉', sub: '豆腐', category: 'seafood' },
    { main: '鱼肉', sub: '番茄', category: 'seafood' },
    { main: '虾仁', sub: '鸡蛋', category: 'seafood' },
    
    // 蔬菜+谷物
    { main: '南瓜', sub: '小米', category: 'veg' },
    { main: '胡萝卜', sub: '大米', category: 'veg' },
    { main: '菠菜', sub: '豆腐', category: 'veg' },
    { main: '番茄', sub: '鸡蛋', category: 'veg' },
    { main: '西兰花', sub: '虾仁', category: 'veg' },
  ];
  
  // 烹饪方法模板
  static readonly COOKING_TEMPLATES = [
    {
      adult: { method: '红烧', flavor: '浓郁' },
      baby: { method: '蒸', texture: '软嫩' },
    },
    {
      adult: { method: '清炒', flavor: '清爽' },
      baby: { method: '水煮', texture: '软烂' },
    },
    {
      adult: { method: '煎炸', flavor: '香酥' },
      baby: { method: '蒸', texture: '嫩滑' },
    },
    {
      adult: { method: '炖煮', flavor: '软烂' },
      baby: { method: '炖', texture: '软烂' },
    },
  ];
  
  /**
   * 批量生成配对菜谱
   */
  static generateBatch(count: number = 20): any[] {
    const recipes: any[] = [];
    
    for (let i = 0; i < Math.min(count, this.CORE_COMBINATIONS.length); i++) {
      const combo = this.CORE_COMBINATIONS[i];
      const template = this.COOKING_TEMPLATES[i % this.COOKING_TEMPLATES.length];
      
      const recipe = this.generateRecipe(combo, template, i);
      recipes.push(recipe);
    }
    
    return recipes;
  }
  
  /**
   * 生成单个配对菜谱
   */
  private static generateRecipe(combo: any, template: any, index: number): any {
    const id = `recipe_${String(index + 10).padStart(3, '0')}`;
    
    return {
      id,
      name: `${template.adult.method}${combo.main} / ${combo.main}${combo.sub}泥`,
      type: index % 2 === 0 ? 'dinner' : 'lunch',
      category: JSON.stringify(['一菜两吃', combo.category]),
      is_paired: true,
      pair_type: combo.category,
      main_ingredients: JSON.stringify([
        { name: combo.main, amount_adult: '300g', amount_baby: '50g' },
        { name: combo.sub, amount_adult: '150g', amount_baby: '30g' },
      ]),
      // ... 更多字段
    };
  }
}

// 导出工具函数
export const RecipePairingUtils = {
  // 检查食材是否适合宝宝
  isBabyFriendly(ingredient: string, age: number): boolean {
    for (const category of Object.values(INGREDIENT_MAPPING)) {
      if (category[ingredient] && category[ingredient].minAge <= age) {
        return true;
      }
    }
    return false;
  },
  
  // 获取推荐年龄段
  getRecommendedAge(ingredients: string[]): string {
    let minAge = 0;
    
    for (const ing of ingredients) {
      for (const category of Object.values(INGREDIENT_MAPPING)) {
        if (category[ing]) {
          minAge = Math.max(minAge, category[ing].minAge);
        }
      }
    }
    
    if (minAge <= 8) return '6-12个月';
    if (minAge <= 12) return '8-18个月';
    return '1-3岁';
  },
  
  // 生成营养报告
  generateNutritionReport(ingredients: string[]) {
    const report = {
      protein: 0,
      vitamins: [] as string[],
      minerals: [] as string[],
      suggestions: [] as string[],
    };
    
    for (const ing of ingredients) {
      if (['鸡肉', '猪肉', '牛肉', '鱼', '虾', '蛋'].some(m => ing.includes(m))) {
        report.protein += 1;
      }
      if (['胡萝卜', '南瓜', '番茄', '菠菜'].some(v => ing.includes(v))) {
        report.vitamins.push('维生素A');
      }
    }
    
    return report;
  },
};
