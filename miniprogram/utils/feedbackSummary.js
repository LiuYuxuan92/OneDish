function summarizeFeedbackState(items = []) {
  if (!Array.isArray(items) || !items.length) return null;

  const latest = items[0];

  if (latest.accepted_level === 'like') {
    return { state: 'accepted', label: '宝宝接受过' };
  }

  if (latest.accepted_level === 'reject') {
    return { state: 'rejected', label: '之前拒绝过' };
  }

  if (latest.accepted_level === 'ok') {
    return { state: 'retry', label: '建议后续再试' };
  }

  return null;
}

module.exports = {
  summarizeFeedbackState,
};
