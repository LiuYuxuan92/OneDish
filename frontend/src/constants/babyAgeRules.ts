// 1. TextureLevel 类型和 getTextureForAge 函数
export type TextureLevel = 'puree' | 'mash' | 'minced' | 'small_chunks' | 'normal';

export function getTextureForAge(months: number): TextureLevel {
  if (months < 8)  return 'puree';
  if (months < 10) return 'mash';
  if (months < 12) return 'minced';
  if (months < 18) return 'small_chunks';
  return 'normal';
}

// 2. TEXTURE_LABELS 映射
export const TEXTURE_LABELS: Record<TextureLevel, string> = {
  puree:        '泥状（细腻光滑）',
  mash:         '糊状（可有细小颗粒）',
  minced:       '细碎（约0.3cm小粒）',
  small_chunks: '小块（约1cm，练习咀嚼）',
  normal:       '正常大小',
};

// 3. AllergyRule 接口和 ALLERGY_RULES 数组
export interface AllergyRule {
  name: string;
  minAge: number;
  risk: 'high' | 'medium';
  note: string;
}

export const ALLERGY_RULES: AllergyRule[] = [
  { name: '蜂蜜', minAge: 12, risk: 'high', note: '12月以下含有肉毒杆菌芽孢，严禁食用' },
  { name: '整颗坚果', minAge: 36, risk: 'high', note: '36月以下有噎呛风险，需磨碎' },
  { name: '花生', minAge: 6, risk: 'high', note: '建议首次单独少量尝试，观察24小时' },
  { name: '虾', minAge: 8, risk: 'high', note: '建议首次单独少量尝试，观察反应' },
  { name: '蟹', minAge: 12, risk: 'high', note: '建议12月后引入，单独尝试' },
  { name: '蛋白', minAge: 8, risk: 'medium', note: '蛋黄可6月引入，蛋白建议8月后' },
  { name: '牛奶', minAge: 12, risk: 'medium', note: '作为饮品建议12月后，烹饪用少量可早些' },
];

// 4. checkAllergyRisk 函数
export function checkAllergyRisk(ingredientName: string, babyAgeMonths: number): AllergyRule | null {
  const rule = ALLERGY_RULES.find(r =>
    ingredientName.includes(r.name) || r.name.includes(ingredientName)
  );
  if (!rule) return null;
  if (babyAgeMonths < rule.minAge) return rule;
  return null;
}

// 5. getAgeAdaptation 函数
export function getAgeAdaptation(months: number): string {
  if (months < 8)  return `${months}月宝宝：食物需完全打成细腻泥状，不可有颗粒`;
  if (months < 10) return `${months}月宝宝：可以有极细小颗粒，帮助感受食物质地`;
  if (months < 12) return `${months}月宝宝：细碎状，大约0.3cm小粒，练习咀嚼`;
  if (months < 18) return `${months}月宝宝：约1cm小块，咀嚼能力增强`;
  if (months < 24) return `${months}月宝宝：接近正常大小，和大人一起吃`;
  return `${months}月宝宝：可以吃接近成人的食物`;
}
