Page({
  data: {
    url: '',
    title: '',
  },

  onLoad(options) {
    if (options.url) {
      const url = decodeURIComponent(options.url);
      this.setData({ url });
    }
    if (options.title) {
      const title = decodeURIComponent(options.title);
      this.setData({ title });
      wx.setNavigationBarTitle({ title });
    }
  },

  onShareAppMessage() {
    return {
      title: this.data.title || '趣学坊',
      path: `/pages/webview/index?url=${encodeURIComponent(this.data.url)}`,
    };
  },
});
