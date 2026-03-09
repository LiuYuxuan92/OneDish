import { FeedingFeedbackRecipeSummary } from './feedingFeedback.service';

export interface FeedingExplanation {
  summary: {
    feedback_count: number;
    like_count: number;
    ok_count: number;
    reject_count: number;
    allergy_count: number;
    latest_feedback_at?: string;
    latest_accepted_level?: 'like' | 'ok' | 'reject';
  };
  signal_level: 'positive' | 'neutral' | 'cautious';
  tags: Array<{ code: string; label: string }>;
  reasons: Array<{ code: string; label: string; detail: string; contribution?: number }>;
  caution_note?: string;
}

class FeedingExplanationGenerator {
  generate(summary: FeedingFeedbackRecipeSummary | null | undefined): FeedingExplanation | null {
    if (!summary || !summary.feedback_count) {
      return null;
    }

    const total = Math.max(1, Number(summary.feedback_count) || 0);
    const likeCount = Number(summary.like_count) || 0;
    const okCount = Number(summary.ok_count) || 0;
    const rejectCount = Number(summary.reject_count) || 0;
    const allergyCount = Number(summary.allergy_count) || 0;

    const positiveRatio = (likeCount + okCount) / total;
    const rejectRatio = rejectCount / total;

    let signalLevel: FeedingExplanation['signal_level'] = 'neutral';
    if (allergyCount > 0 || rejectRatio >= 0.4) {
      signalLevel = 'cautious';
    } else if (positiveRatio >= 0.7 && likeCount >= rejectCount) {
      signalLevel = 'positive';
    }

    const tags: FeedingExplanation['tags'] = [];
    const reasons: FeedingExplanation['reasons'] = [];

    if (likeCount > 0) {
      tags.push({ code: 'liked', label: '接受度较好' });
      reasons.push({
        code: 'likes',
        label: '历史接受度',
        detail: `${likeCount}次反馈表示喜欢，共${total}次记录。`,
        contribution: Number((likeCount / total).toFixed(2)),
      });
    }

    if (okCount > 0 && rejectCount === 0) {
      tags.push({ code: 'stable', label: '表现稳定' });
      reasons.push({
        code: 'stable',
        label: '近期表现',
        detail: `有${okCount}次可接受反馈，暂无明确排斥记录。`,
        contribution: Number((okCount / total).toFixed(2)),
      });
    }

    if (rejectCount > 0) {
      tags.push({ code: 'cautious', label: '需要留意' });
      reasons.push({
        code: 'reject',
        label: '拒绝记录',
        detail: `${rejectCount}次反馈表示不接受，建议结合近期状态谨慎尝试。`,
        contribution: Number((rejectCount / total).toFixed(2)),
      });
    }

    if (allergyCount > 0) {
      tags.push({ code: 'allergy', label: '过敏提醒' });
      reasons.push({
        code: 'allergy',
        label: '过敏标记',
        detail: `历史中有${allergyCount}次过敏相关反馈，复做前请确认食材安全。`,
        contribution: Number((allergyCount / total).toFixed(2)),
      });
    }

    if (!tags.length) {
      tags.push({ code: 'history', label: '已有记录' });
    }

    if (!reasons.length) {
      reasons.push({
        code: 'history',
        label: '历史反馈',
        detail: `已累计${total}次喂养记录，可作为搜索排序参考。`,
        contribution: 1,
      });
    }

    const cautionNote = allergyCount > 0
      ? '存在过敏反馈，建议优先确认替代食材或减少尝试量。'
      : (signalLevel === 'cautious' ? '近期反馈偏谨慎，建议降低频次或调整做法后再尝试。' : undefined);

    return {
      summary: {
        feedback_count: total,
        like_count: likeCount,
        ok_count: okCount,
        reject_count: rejectCount,
        allergy_count: allergyCount,
        latest_feedback_at: summary.latest_feedback_at || undefined,
        latest_accepted_level: summary.latest_accepted_level || undefined,
      },
      signal_level: signalLevel,
      tags,
      reasons,
      ...(cautionNote ? { caution_note: cautionNote } : {}),
    };
  }
}

export const feedingExplanationGenerator = new FeedingExplanationGenerator();