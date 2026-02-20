/**
 * 同步烹饪时间线服务
 * 根据大人版和宝宝版食谱生成同步烹饪时间线
 */

import { Recipe, RecipeVersion, BabyVersion, SyncTimeline, TimelinePhase, TimelinePhaseType } from '../types';
import { logger } from '../utils/logger';

export class SyncTimelineService {
  /**
   * 生成同步烹饪时间线
   */
  generateTimeline(
    adultRecipe: Recipe,
    babyVersion: BabyVersion,
    babyAgeMonths: number
  ): SyncTimeline {
    const adultVersion = adultRecipe.adult_version;
    const phases: TimelinePhase[] = [];
    let order = 1;

    // 1. 识别共用备料步骤
    const sharedPrepPhases = this.findSharedPrepSteps(adultVersion, babyVersion);
    for (const phase of sharedPrepPhases) {
      phases.push({ ...phase, order: order++ });
    }

    // 2. 插入分叉点
    if (sharedPrepPhases.length > 0) {
      phases.push({
        order: order++,
        type: 'fork',
        target: 'both',
        action: '分叉点：大人版和宝宝版开始不同的烹饪步骤',
        duration: 0,
        note: '此时将食材分为两份，分别按大人版和宝宝版步骤烹饪',
      });
    }

    // 3. 宝宝独立步骤（先做宝宝的，因为通常更简单且需要冷却时间）
    const babyOnlySteps = this.getBabyOnlySteps(adultVersion, babyVersion);
    const babyStartOrder = order;
    for (const step of babyOnlySteps) {
      phases.push({
        order: order++,
        type: 'baby',
        target: 'baby',
        action: step.action,
        duration: step.time || 3,
        tools: step.tools,
        note: step.note,
        timer_required: (step.time || 0) > 2,
      });
    }

    // 4. 大人独立步骤（可与宝宝步骤并行）
    const adultOnlySteps = this.getAdultOnlySteps(adultVersion, babyVersion);
    for (let i = 0; i < adultOnlySteps.length; i++) {
      const step = adultOnlySteps[i];
      const parallelWith = i < babyOnlySteps.length ? babyStartOrder + i : undefined;
      phases.push({
        order: order++,
        type: 'adult',
        target: 'adult',
        action: step.action,
        duration: step.time || 5,
        tools: step.tools,
        note: step.note,
        parallel_with: parallelWith,
        timer_required: (step.time || 0) > 3,
      });
    }

    // 计算时间
    const totalSequential = this.calculateTotalTime(phases);
    const totalParallel = this.calculateParallelTime(phases);
    const timeSaved = totalSequential - totalParallel;

    return {
      recipe_id: adultRecipe.id,
      baby_age_months: babyAgeMonths,
      total_time: totalParallel,
      time_saved: Math.max(0, timeSaved),
      phases,
    };
  }

  /**
   * 识别共用备料步骤
   */
  private findSharedPrepSteps(
    adultVersion: RecipeVersion,
    babyVersion: BabyVersion
  ): TimelinePhase[] {
    const shared: TimelinePhase[] = [];
    const adultSteps = adultVersion.steps || [];
    const babySteps = babyVersion.steps || [];

    // 备料关键词
    const prepKeywords = ['清洗', '洗净', '切', '剥', '去皮', '准备', '浸泡', '解冻'];

    for (const adultStep of adultSteps) {
      const isPrep = prepKeywords.some(kw => adultStep.action.includes(kw));
      if (!isPrep) continue;

      // 检查宝宝版是否有类似步骤
      const hasSimilar = babySteps.some(bs =>
        prepKeywords.some(kw => bs.action.includes(kw) && this.hasOverlappingIngredients(adultStep.action, bs.action))
      );

      if (hasSimilar || isPrep) {
        shared.push({
          order: 0,
          type: 'shared',
          target: 'both',
          action: `${adultStep.action}（大人和宝宝共用）`,
          duration: adultStep.time || 3,
          tools: adultStep.tools,
          note: '一次准备，分两份使用',
        });
      }
    }

    return shared;
  }

  /**
   * 检查两个步骤描述是否涉及相同食材
   */
  private hasOverlappingIngredients(action1: string, action2: string): boolean {
    const foodKeywords = ['肉', '菜', '蛋', '鱼', '虾', '豆', '米', '面', '番茄', '土豆', '胡萝卜', '白菜', '青椒'];
    return foodKeywords.some(kw => action1.includes(kw) && action2.includes(kw));
  }

  /**
   * 获取宝宝独有的烹饪步骤（排除备料）
   */
  private getBabyOnlySteps(adultVersion: RecipeVersion, babyVersion: BabyVersion) {
    const prepKeywords = ['清洗', '洗净', '切', '剥', '去皮', '准备', '浸泡', '解冻'];
    return (babyVersion.steps || []).filter(step =>
      !prepKeywords.some(kw => step.action.includes(kw))
    );
  }

  /**
   * 获取大人独有的烹饪步骤（排除备料）
   */
  private getAdultOnlySteps(adultVersion: RecipeVersion, babyVersion: BabyVersion) {
    const prepKeywords = ['清洗', '洗净', '切', '剥', '去皮', '准备', '浸泡', '解冻'];
    return (adultVersion.steps || []).filter(step =>
      !prepKeywords.some(kw => step.action.includes(kw))
    );
  }

  /**
   * 计算顺序执行总时间
   */
  private calculateTotalTime(phases: TimelinePhase[]): number {
    return phases.reduce((sum, p) => sum + p.duration, 0);
  }

  /**
   * 计算并行执行总时间
   */
  private calculateParallelTime(phases: TimelinePhase[]): number {
    let total = 0;
    const parallelGroups = new Map<number, number>();

    for (const phase of phases) {
      if (phase.parallel_with) {
        // 并行步骤取最大时间
        const existing = parallelGroups.get(phase.parallel_with) || 0;
        parallelGroups.set(phase.parallel_with, Math.max(existing, phase.duration));
      } else if (!Array.from(parallelGroups.values()).includes(phase.order)) {
        total += phase.duration;
      }
    }

    // 添加并行组的最大时间
    for (const maxTime of parallelGroups.values()) {
      total += maxTime;
    }

    return total;
  }
}

export const syncTimelineService = new SyncTimelineService();
