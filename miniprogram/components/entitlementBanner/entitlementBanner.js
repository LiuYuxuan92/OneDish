Component({
  properties: {
    title: { type: String, value: '' },
    subtitle: { type: String, value: '' },
    badgeText: { type: String, value: '' },
    actionText: { type: String, value: '' },
    footerText: { type: String, value: '' },
    theme: { type: String, value: 'neutral' },
    quotaCards: { type: Array, value: [] },
  },
  methods: {
    onActionTap() {
      this.triggerEvent('actiontap');
    },
  },
});
