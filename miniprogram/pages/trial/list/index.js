const { get, resolveImageUrl } = require('../../../utils/request');
const { getToken } = require('../../../utils/auth');

// 用户端友好状态映射
const statusMap = {
  pending: '等待回复',
  contacted: '老师已联系',
  scheduled: '试听已安排',
  completed: '已完成试听',
  converted: '已正式报名',
  cancelled: '已取消',
};

Page({
  data: {
    navPaddingTop: 20,
    trials: [],
    loading: true,
    page: 1,
    pageSize: 10,
    hasMore: true,
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });
    if (!getToken()) {
      wx.redirectTo({ url: '/pages/login/index' });
      return;
    }
    this.loadTrials();
  },

  async loadTrials() {
    if (this.data.loading && this.data.page > 1) return;
    this.setData({ loading: true });
    try {
      const res = await get('/trial-bookings/my', {
        page: this.data.page,
        pageSize: this.data.pageSize,
      });
      const items = (res.items || []).map((t) => this.formatTrial(t));
      const newTrials = this.data.page === 1 ? items : [...this.data.trials, ...items];
      this.setData({
        trials: newTrials,
        hasMore: items.length >= this.data.pageSize,
        loading: false,
      });
    } catch (e) {
      console.error('加载试听预约失败', e);
      this.setData({ loading: false });
    }
  },

  _fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  _fmtDateTime(d) {
    return `${this._fmtDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },

  formatTrial(t) {
    const created = new Date(t.createdAt);
    const dateTimeStr = this._fmtDateTime(created);
    let preferDateStr = '';
    if (t.preferDate) {
      preferDateStr = this._fmtDate(new Date(t.preferDate));
    }
    return {
      id: t.id,
      courseId: t.courseId,
      courseName: t.course?.name || '未知课程',
      coverImage: t.course?.coverImage ? resolveImageUrl(t.course.coverImage) : '',
      status: t.status,
      statusText: statusMap[t.status] || t.status,
      preferDate: t.preferDate,
      preferDateStr,
      remark: t.remark || '',
      dateTimeStr,
    };
  },

  onPullDownRefresh() {
    this.setData({ page: 1, trials: [], hasMore: true });
    this.loadTrials().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 });
    this.loadTrials();
  },

  goCourseDetail(e) {
    const courseId = e.currentTarget.dataset.courseId;
    if (courseId) {
      wx.navigateTo({ url: `/pages/course/detail/index?id=${courseId}` });
    }
  },

  goCourseList() {
    wx.switchTab({ url: '/pages/course/list/index' });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/index' }) });
  },
});
