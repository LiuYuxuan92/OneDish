const { trackEvent } = require('./analytics');

const FEATURE_LABELS = {
  ai_baby_recipe: '宝宝版 AI 改写',
  weekly_plan_from_prompt: '自然语言周计划',
  smart_recommendation: '智能推荐 / 换菜',
};

const FEATURE_UPGRADE_MODAL = {
  ai_baby_recipe: {
    title: '宝宝版 AI 次数不足',
    content: '宝宝版 AI 改写已接入成长会员次数权益，可前往会员页查看剩余次数或续费。',
  },
  weekly_plan_from_prompt: {
    title: '当前次数已用完',
    content: '自然语言周计划属于成长会员次数权益，可前往会员页查看剩余次数或续费。',
  },
  smart_recommendation: {
    title: '智能推荐次数不足',
    content: '智能推荐 / 换菜已接入成长会员次数权益，可前往会员页查看剩余次数或续费。',
  },
};

function buildQuotaCard(summary, featureCode) {
  const quotaSummary = Array.isArray(summary?.quota_summary) ? summary.quota_summary : [];
  const matched = quotaSummary.find((item) => item.feature_code === featureCode);
  if (!matched) return null;

  return {
    featureCode,
    title: FEATURE_LABELS[featureCode] || featureCode,
    value: `${matched.remaining_quota}/${matched.total_quota}`,
    desc: matched.reset_modes?.includes('period') ? '会员周期内可用' : '按包消耗',
    available: matched.remaining_quota > 0,
  };
}

function buildQuotaCards(summary, featureCodes = []) {
  return featureCodes.map((featureCode) => buildQuotaCard(summary, featureCode)).filter(Boolean);
}

function buildBannerModel({
  title,
  subtitle = '',
  badgeText = '',
  actionText = '',
  footerText = '',
  quotaCards = [],
  theme = 'neutral',
}) {
  return {
    title,
    subtitle,
    badgeText,
    actionText,
    footerText,
    quotaCards,
    theme,
  };
}

function isQuotaUpgradeRequiredError(error, featureCode) {
  const quotaFeatureCode = error?.data?.feature_code || error?.featureCode || null;
  const matchedFeature = !featureCode || !quotaFeatureCode || quotaFeatureCode === featureCode;
  return Boolean(
    matchedFeature
      && error?.statusCode === 403
      && (error?.data?.upgrade_required || String(error?.message || '').includes('会员') || String(error?.message || '').includes('次数'))
  );
}

function handleQuotaUpgradeError(error, { featureCode, source = 'unknown', onConfirm } = {}) {
  if (!isQuotaUpgradeRequiredError(error, featureCode)) {
    return false;
  }

  const modal = FEATURE_UPGRADE_MODAL[featureCode] || {
    title: '会员权益不足',
    content: '当前能力需要成长会员权益，可前往会员页查看剩余次数或续费。',
  };

  trackEvent('mp_quota_modal_show', {
    source,
    feature_code: featureCode || error?.data?.feature_code || '',
  });

  wx.showModal({
    title: modal.title,
    content: modal.content,
    confirmText: '去会员页',
    success: (res) => {
      if (!res.confirm) return;
      trackEvent('mp_quota_modal_confirm', {
        source,
        feature_code: featureCode || error?.data?.feature_code || '',
      });
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
    },
  });

  return true;
}

module.exports = {
  FEATURE_LABELS,
  buildQuotaCard,
  buildQuotaCards,
  buildBannerModel,
  isQuotaUpgradeRequiredError,
  handleQuotaUpgradeError,
};
