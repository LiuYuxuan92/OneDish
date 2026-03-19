Page({
  data: {
    statusTag: '建设中',
    supportText: '当前版本仅提供家庭入口与占位说明，真实家庭协作能力待后端支持后接入。',
    placeholderNotice: '当前页面仅用于承接入口，不会创建家庭、加入家庭，也不会生成真实邀请码。',
    actionToastPrefix: '当前仅提供入口占位，',
    familyActions: [
      {
        key: 'create',
        title: '创建家庭',
        description: '后续将支持创建家庭空间并邀请家人加入。',
        badge: '待接后端'
      },
      {
        key: 'join',
        title: '加入家庭',
        description: '后续将支持通过邀请码加入已有家庭。',
        badge: '待接后端'
      },
      {
        key: 'invite',
        title: '查看邀请码',
        description: '当前先展示占位说明，后续接入真实邀请码与分享能力。',
        badge: '待接后端'
      },
      {
        key: 'members',
        title: '查看成员',
        description: '后续将展示家庭成员、角色与协作状态。',
        badge: '待接后端'
      }
    ]
  },

  onActionTap(e) {
    const { title } = e.currentTarget.dataset;
    wx.showToast({
      title: `${this.data.actionToastPrefix}${title}待后端支持`,
      icon: 'none'
    });
  }
});
