const { get, put } = require('../../../utils/request');
const { subscribeByScene } = require('../../../utils/subscribe');

Page({
  data: {
    navPaddingTop: 20,
    order: null,
    loading: true,
  },

  onLoad(options) {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });
    if (options.orderId) {
      this.loadOrder(options.orderId);
    }
  },

  async loadOrder(id) {
    this.setData({ loading: true });
    try {
      const order = await get(`/orders/${id}`);
      this.setData({ order, loading: false });
    } catch (e) {
      console.error('加载订单详情失败', e);
      this.setData({ loading: false });
      wx.showToast({ title: '订单不存在', icon: 'none' });
    }
  },

  async onCancelOrder() {
    const that = this;
    wx.showModal({
      title: '提示',
      content: '确定要取消该订单吗？',
      async success(res) {
        if (res.confirm) {
          try {
            await put(`/orders/${that.data.order.id}/cancel`);
            wx.showToast({ title: '已取消', icon: 'success' });
            that.loadOrder(that.data.order.id);
          } catch (e) {
            console.error('取消失败', e);
          }
        }
      },
    });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/index' }) });
  },

  goOrderList() {
    wx.navigateTo({ url: '/pages/order/list/index' });
  },

  async onContact() {
    await subscribeByScene('order');
    wx.makePhoneCall({ phoneNumber: '400-000-000' });
  },
});
