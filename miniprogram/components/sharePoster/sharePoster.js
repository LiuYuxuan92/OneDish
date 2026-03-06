Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: ''
    },
    coverUrl: {
      type: String,
      value: ''
    }
  },

  data: {
    posterGenerated: false,
    posterUrl: ''
  },

  methods: {
    hide() {
      this.triggerEvent('close');
    },

    // 生成海报
    generatePoster() {
      wx.showLoading({ title: '生成中...' });
      
      const ctx = wx.createCanvasContext('poster-canvas', this);
      
      // 背景
      ctx.setFillStyle('#fff');
      ctx.fillRect(0, 0, 300, 450);
      
      // 封面图区域
      if (this.data.coverUrl) {
        ctx.drawImage(this.data.coverUrl, 0, 0, 300, 200);
      } else {
        ctx.setFillStyle('#f5f7fb');
        ctx.fillRect(0, 0, 300, 200);
        ctx.setFontSize(60);
        ctx.setFillStyle('#ccc');
        ctx.setTextAlign('center');
        ctx.fillText('🍽️', 150, 120);
      }
      
      // 标题
      ctx.setFillStyle('#333');
      ctx.setFontSize(20);
      ctx.setTextAlign('left');
      const title = this.data.title || '简家厨菜谱';
      ctx.fillText(title.substring(0, 20), 20, 240);
      
      // 副标题
      ctx.setFillStyle('#666');
      ctx.setFontSize(14);
      ctx.fillText('一鱼两吃 · 宝宝辅食', 20, 270);
      
      // 标签
      ctx.setFillStyle('#07c160');
      ctx.setFontSize(12);
      ctx.fillText('👶 适合宝宝', 20, 300);
      
      // 小程序码提示
      ctx.setFillStyle('#999');
      ctx.setFontSize(12);
      ctx.setTextAlign('center');
      ctx.fillText('扫码查看完整菜谱', 150, 380);
      
      // 品牌
      ctx.setFillStyle('#1677ff');
      ctx.setFontSize(14);
      ctx.fillText('简家厨', 150, 420);
      
      ctx.draw(false, () => {
        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvasId: 'poster-canvas',
            success: (res) => {
              this.setData({
                posterGenerated: true,
                posterUrl: res.tempFilePath
              });
              wx.hideLoading();
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: '生成失败', icon: 'none' });
            }
          }, this);
        }, 500);
      });
    },

    // 保存到相册
    savePoster() {
      if (!this.data.posterUrl) {
        wx.showToast({ title: '请先生成海报', icon: 'none' });
        return;
      }
      
      wx.saveImageToPhotosAlbum({
        filePath: this.data.posterUrl,
        success: () => {
          wx.showToast({ title: '已保存到相册', icon: 'success' });
          this.hide();
        },
        fail: () => {
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      });
    },

    // 分享给朋友
    shareToFriend() {
      this.hide();
    }
  }
});
