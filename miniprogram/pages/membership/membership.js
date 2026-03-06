const app = getApp();

Page({
  data: {
    isMember: false,
    expireDate: '',
    memberLevel: 'free',
    benefits: [
      { icon: '🤖', title: 'AI智能推荐', desc: '根据宝宝月龄智能推荐', isVip: true },
      { icon: '📚', title: '专属菜谱', desc: '会员专属精品菜谱', isVip: true },
      { icon: '🚫', title: '无广告', desc: '清爽无广告体验', isVip: true },
      { icon: '❤️', title: '无限收藏', desc: '收藏无限量菜谱', isVip: true },
      { icon: '📅', title: '无限推荐', desc: '每日推荐无限量', isVip: true },
      { icon: '⭐', title: '基础功能', desc: '每日3条推荐', isVip: false },
    ]
  },

  onLoad() {
    this.checkMemberStatus();
  },

  onShow() {
    this.checkMemberStatus();
  },

  checkMemberStatus() {
    const memberInfo = wx.getStorageSync('member_info') || {};
    const isMember = memberInfo.isMember || false;
    const expireDate = memberInfo.expireDate || '';
    
    // 检查是否过期
    if (isMember && expireDate) {
      const expire = new Date(expireDate).getTime();
      if (Date.now() > expire) {
        // 已过期
        wx.setStorageSync('member_info', { isMember: false, expireDate: '' });
        this.setData({ isMember: false, expireDate: '' });
        return;
      }
    }
    
    this.setData({ 
      isMember, 
      expireDate: isMember ? this.formatDate(expireDate) : '' 
    });
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  },

  // 开通会员（模拟）
  openMember() {
    wx.showModal({
      title: '开通会员',
      content: '¥9.9/月，开通后享受所有会员特权',
      confirmText: '立即开通',
      success: (res) => {
        if (res.confirm) {
          // 模拟支付成功
          const expireDate = new Date();
          expireDate.setMonth(expireDate.getMonth() + 1);
          
          wx.setStorageSync('member_info', {
            isMember: true,
            expireDate: expireDate.toISOString(),
            level: 'vip'
          });
          
          this.setData({
            isMember: true,
            expireDate: this.formatDate(expireDate.toISOString())
          });
          
          wx.showToast({
            title: '开通成功！',
            icon: 'success'
          });
        }
      }
    });
  },

  // 续费会员
  renewMember() {
    this.openMember();
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '简家厨 - 一鱼两吃宝宝辅食',
      path: '/pages/home/home'
    };
  },

  onShareTimeline() {
    return {
      title: '简家厨 - 一鱼两吃宝宝辅食',
      query: ''
    };
  }
});
