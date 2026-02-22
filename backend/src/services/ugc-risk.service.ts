export type RiskLevel = 'block' | 'warn';

export interface RiskHit {
  key: string;
  level: RiskLevel;
  keyword: string;
  reason: string;
  suggestion?: string;
}

interface RiskRule {
  key: string;
  level: RiskLevel;
  keywords: string[];
  whitelist?: string[];
  reason: string;
  suggestion?: string;
  ageGate?: (age: { minMonths: number | null; maxMonths: number | null }) => boolean;
}

export interface RiskConfig {
  rules: RiskRule[];
}

const defaultConfig: RiskConfig = {
  rules: [
    {
      key: 'honey-under-12m',
      level: 'block',
      keywords: ['蜂蜜'],
      whitelist: ['蜂蜜色', '蜂蜜肌'],
      reason: '<12m 禁止蜂蜜，存在肉毒杆菌芽孢风险',
      suggestion: '改为南瓜泥/香蕉泥等天然甜味食材',
      ageGate: ({ minMonths }) => (minMonths ?? 0) < 12,
    },
    {
      key: 'whole-nut-choking',
      level: 'block',
      keywords: ['整颗坚果', '整粒坚果', '整颗花生', '整粒花生'],
      reason: '整颗坚果存在高噎呛风险，强拦截',
      suggestion: '改为坚果酱或充分研磨成粉',
    },
    {
      key: 'alcohol',
      level: 'block',
      keywords: ['酒精', '白酒', '啤酒', '黄酒', '葡萄酒', '料酒'],
      reason: '婴幼儿饮食不应包含酒精相关食材',
      suggestion: '改用清水/高汤去腥提香',
    },
    {
      key: 'salt-sugar-heavy',
      level: 'warn',
      keywords: ['高盐', '重盐', '高糖', '重糖', '加糖', '盐焗'],
      reason: '宝宝餐应尽量清淡，控制盐糖摄入',
      suggestion: '减少调味，优先原味烹饪',
    },
  ],
};

export class UgcRiskService {
  constructor(private readonly config: RiskConfig = defaultConfig) {}

  evaluate(recipe: any): { riskHits: RiskHit[]; safeForSubmit: boolean } {
    const text = this.extractText(recipe).toLowerCase();
    const age = this.parseAgeRange(recipe?.baby_age_range);
    const hits: RiskHit[] = [];

    for (const rule of this.config.rules) {
      if (rule.ageGate && !rule.ageGate(age)) continue;

      for (const keyword of rule.keywords) {
        const kw = keyword.toLowerCase();
        if (!text.includes(kw)) continue;

        const whitelisted = (rule.whitelist || []).some((w) => text.includes(w.toLowerCase()));
        if (whitelisted) continue;

        hits.push({
          key: rule.key,
          level: rule.level,
          keyword,
          reason: rule.reason,
          suggestion: rule.suggestion,
        });
      }
    }

    const deduped = hits.filter((hit, index) => index === hits.findIndex((h) => h.key === hit.key && h.keyword === hit.keyword));
    const safeForSubmit = !deduped.some((h) => h.level === 'block');
    return { riskHits: deduped, safeForSubmit };
  }

  private extractText(recipe: any): string {
    const parts: string[] = [];
    const push = (v: any) => {
      if (v == null) return;
      if (typeof v === 'string') parts.push(v);
      else parts.push(JSON.stringify(v));
    };

    push(recipe?.name);
    push(recipe?.cooking_tips);
    push(recipe?.tags);
    push(recipe?.adult_version);
    push(recipe?.baby_version);
    push(recipe?.step_branches);

    return parts.join(' ');
  }

  private parseAgeRange(raw: string | null | undefined): { minMonths: number | null; maxMonths: number | null } {
    if (!raw) return { minMonths: null, maxMonths: null };

    const text = String(raw).trim().toLowerCase();
    const nums = text.match(/\d+/g)?.map((n) => Number(n)).filter((n) => !Number.isNaN(n)) || [];

    if (text.includes('<') && nums.length > 0) {
      return { minMonths: 0, maxMonths: nums[0] - 1 };
    }

    if (nums.length >= 2) {
      return { minMonths: nums[0], maxMonths: nums[1] };
    }

    if (nums.length === 1) {
      return { minMonths: nums[0], maxMonths: nums[0] };
    }

    return { minMonths: null, maxMonths: null };
  }
}
