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

    generatePoster() {
      wx.showLoading({ title: '生成中...' });

      const ctx = wx.createCanvasContext('poster-canvas', this);
      const title = this.data.title || '简家厨菜谱';

      ctx.setFillStyle('#fbfaf6');
      ctx.fillRect(0, 0, 300, 450);

      ctx.setFillStyle('#e9dfd0');
      ctx.beginPath();
      ctx.arc(246, 54, 68, 0, Math.PI * 2);
      ctx.fill();

      ctx.setFillStyle('#f2f4ef');
      ctx.fillRect(18, 18, 264, 414);

      if (this.data.coverUrl) {
        ctx.drawImage(this.data.coverUrl, 32, 38, 236, 176);
      } else {
        ctx.setFillStyle('#e4e9e4');
        ctx.fillRect(32, 38, 236, 176);
        ctx.setStrokeStyle('#8d6a40');
        ctx.setLineWidth(4);
        ctx.strokeRect(118, 102, 64, 48);
        ctx.beginPath();
        ctx.arc(150, 96, 16, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.setFillStyle('#274539');
      ctx.fillRect(32, 240, 74, 22);
      ctx.setFillStyle('#ffffff');
      ctx.setFontSize(10);
      ctx.setTextAlign('center');
      ctx.fillText('ONE DISH', 69, 255);

      ctx.setFillStyle('#22342b');
      ctx.setFontSize(20);
      ctx.setTextAlign('left');
      ctx.fillText(title.substring(0, 20), 32, 292);

      ctx.setFillStyle('#71807a');
      ctx.setFontSize(13);
      ctx.fillText('一鱼两吃 · 宝宝辅食', 32, 322);

      ctx.setFillStyle('#8d6a40');
      ctx.fillRect(32, 340, 96, 28);
      ctx.setFillStyle('#ffffff');
      ctx.setFontSize(12);
      ctx.fillText('适合宝宝', 80, 358);

      ctx.setStrokeStyle('#d8ddd8');
      ctx.setLineWidth(1);
      ctx.beginPath();
      ctx.moveTo(32, 388);
      ctx.lineTo(268, 388);
      ctx.stroke();

      ctx.setFillStyle('#7b857f');
      ctx.setFontSize(12);
      ctx.setTextAlign('center');
      ctx.fillText('扫码查看完整菜谱', 150, 410);

      ctx.setFillStyle('#274539');
      ctx.setFontSize(14);
      ctx.fillText('简家厨', 150, 430);

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

    shareToFriend() {
      this.hide();
    }
  }
});
