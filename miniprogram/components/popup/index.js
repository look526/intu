const { recordShown } = require('../../utils/popup');

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    popupData: {
      type: Object,
      value: null,
    },
  },

  methods: {
    onClose() {
      const popup = this.properties.popupData;
      if (popup) {
        recordShown(popup);
      }
      this.setData({ visible: false });
      this.triggerEvent('close');
    },

    onTap() {
      const popup = this.properties.popupData;
      if (!popup) return;

      const { linkType, linkUrl } = popup;

      // 先关闭弹窗
      this.onClose();

      if (!linkUrl || linkType === 'none') return;

      if (linkType === 'h5') {
        wx.navigateTo({
          url: `/pages/webview/index?url=${encodeURIComponent(linkUrl)}&title=${encodeURIComponent(popup.name || '')}`,
        });
      } else {
        // 小程序内部链接
        const tabPages = ['/pages/index/index', '/pages/course/list/index', '/pages/study/index', '/pages/mine/index'];
        const isTab = tabPages.some(p => linkUrl.startsWith(p));
        if (isTab) {
          wx.switchTab({ url: linkUrl.split('?')[0] });
        } else {
          wx.navigateTo({ url: linkUrl });
        }
      }
    },

    noop() {
      // 阻止遮罩层的滚动穿透
    },
  },
});
