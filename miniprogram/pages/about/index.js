const { get, resolveImageUrl } = require('../../utils/request');

Page({
  data: {
    navPaddingTop: 20,
    content: '',
    loading: true,
  },

  onLoad() {
    const sysInfo = wx.getWindowInfo();
    this.setData({ navPaddingTop: sysInfo.statusBarHeight || 20 });
    this.loadAbout();
  },

  goBack() {
    wx.navigateBack();
  },

  async loadAbout() {
    try {
      const res = await get('/system-config/about_us');
      // res could be a string (HTML content) or an object { content: '...' }
      let content = '';
      if (typeof res === 'string') {
        content = res;
      } else if (res && res.content) {
        content = res.content;
      }
      // Replace relative image URLs
      content = content.replace(/src="(\/uploads\/[^"]+)"/g, (_, path) => {
        return `src="${resolveImageUrl(path)}"`;
      });
      this.setData({ content, loading: false });
    } catch (e) {
      console.error('获取关于我们失败', e);
      this.setData({ content: '<p style="text-align:center;color:#999;padding:40px 0;">暂无内容</p>', loading: false });
    }
  },
});
