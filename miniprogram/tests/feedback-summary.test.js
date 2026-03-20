const { summarizeFeedbackState } = require('../utils/feedbackSummary');

describe('feedback summary helper', () => {
  it('uses the first item as the latest feedback when mapping like to accepted', () => {
    expect(summarizeFeedbackState([
      { accepted_level: 'like' },
      { accepted_level: 'reject' },
    ])).toEqual({
      state: 'accepted',
      label: '宝宝接受过',
    });
  });

  it('returns rejected summary when latest feedback is reject', () => {
    expect(summarizeFeedbackState([
      { accepted_level: 'reject' },
      { accepted_level: 'like' },
    ])).toEqual({
      state: 'rejected',
      label: '之前拒绝过',
    });
  });

  it('returns retry summary when latest feedback is ok', () => {
    expect(summarizeFeedbackState([
      { accepted_level: 'ok' },
    ])).toEqual({
      state: 'retry',
      label: '建议后续再试',
    });
  });

  it('returns retry summary when older feedback is reject but latest is neutral', () => {
    expect(summarizeFeedbackState([
      { accepted_level: 'ok' },
      { accepted_level: 'reject' },
    ])).toEqual({
      state: 'retry',
      label: '建议后续再试',
    });
  });

  it('returns null when accepted_level is unknown or missing on the latest item', () => {
    expect(summarizeFeedbackState([
      { accepted_level: 'maybe' },
      { accepted_level: 'like' },
    ])).toBeNull();
    expect(summarizeFeedbackState([
      {},
      { accepted_level: 'reject' },
    ])).toBeNull();
  });

  it('returns null when feedback is empty', () => {
    expect(summarizeFeedbackState()).toBeNull();
    expect(summarizeFeedbackState([])).toBeNull();
  });

  it('uses the same latest reject summary across surfaces', () => {
    expect(summarizeFeedbackState([
      { accepted_level: 'reject' },
      { accepted_level: 'ok' },
      { accepted_level: 'like' },
    ])).toEqual({
      state: 'rejected',
      label: '之前拒绝过',
    });
  });

  it('returns null for no-feedback recipes so surfaces stay quiet', () => {
    expect(summarizeFeedbackState(null)).toBeNull();
    expect(summarizeFeedbackState([])).toBeNull();
  });
});
