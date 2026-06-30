const { get, put } = require('../../../utils/request');
const { getToken } = require('../../../utils/auth');

Page({
  data: {
    navPaddingTop: 20,
    tabs: [
      { key: '', label: '全部' },
      { key: 'pending', label: '待付款' },
      { key: 'paid', label: '已付款' },
      { key: 'cancelled', label: '已取消' },
    ],
    activeTab: '',
    orders: [],
    loading: true,
    page: 1,
    pageSize: 10,
    hasMore: true,
    refreshing: false,
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });
    if (!getToken()) {
      wx.redirectTo({ url: '/pages/login/index' });
      return;
    }
    this.loadOrders();
  },

  onShow() {
    // 从详情页返回时刷新
    if (this._needRefresh) {
      this._needRefresh = false;
      this.setData({ page: 1, orders: [], hasMore: true });
      this.loadOrders();
    }
  },

  async loadOrders() {
    if (this.data.loading && this.data.page > 1) return;
    this.setData({ loading: true });
    try {
      const params = { page: this.data.page, pageSize: this.data.pageSize };
      if (this.data.activeTab) params.status = this.data.activeTab;
      const res = await get('/orders/my', params);
      const items = res.items || res;
      const newOrders = this.data.page === 1 ? items : [...this.data.orders, ...items];
      this.setData({
        orders: newOrders,
        hasMore: items.length >= this.data.pageSize,
        loading: false,
        refreshing: false,
      });
    } catch (e) {
      console.error('加载订单失败', e);
      this.setData({ loading: false, refreshing: false });
    }
  },

  onTabChange(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ activeTab: key, page: 1, orders: [], hasMore: true });
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, orders: [], hasMore: true, refreshing: true });
    this.loadOrders().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 });
    this.loadOrders();
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    this._needRefresh = true;
    wx.navigateTo({ url: `/pages/order/detail/index?orderId=${id}` });
  },

  async onCancelOrder(e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '提示',
      content: '确定要取消该订单吗？',
      async success(res) {
        if (res.confirm) {
          try {
            await put(`/orders/${id}/cancel`);
            wx.showToast({ title: '已取消', icon: 'success' });
            that.setData({ page: 1, orders: [], hasMore: true });
            that.loadOrders();
          } catch (e) {
            console.error('取消失败', e);
          }
        }
      },
    });
  },

  getStatusText(status) {
    const map = { pending: '待付款', paid: '已付款', cancelled: '已取消' };
    return map[status] || status;
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/index' }) });
  },

  goSelectCourse() {
    wx.switchTab({ url: '/pages/course/list/index' });
  },
});
