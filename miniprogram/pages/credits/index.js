const { get } = require('../../utils/request');

Page({
  data: {
    navPaddingTop: 20,
    credits: 0,
    records: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });
    this.loadCredits();
    this.loadRecords();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, records: [], hasMore: true });
    this.loadCredits();
    this.loadRecords().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadRecords();
    }
  },

  async loadCredits() {
    try {
      const res = await get('/checkin/my-credits');
      this.setData({ credits: res.credits || 0 });
    } catch (e) {
      console.error('loadCredits error:', e);
    }
  },

  async loadRecords() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const { page, pageSize } = this.data;
      const res = await get(`/checkin/my-records?page=${page}&pageSize=${pageSize}`);
      const newRecords = (res.items || []).map((item) => {
        const t = new Date(item.checkinTime);
        return {
          id: item.id,
          courseName: item.schedule?.course?.name || '未知课程',
          classroomName: item.schedule?.classroom?.name || '',
          venueName: item.schedule?.classroom?.venue?.name || '',
          checkinTime: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`,
          locationValid: item.locationValid,
          creditEarned: item.creditEarned,
        };
      });
      const allRecords = page === 1 ? newRecords : [...this.data.records, ...newRecords];
      this.setData({
        records: allRecords,
        page: page + 1,
        hasMore: allRecords.length < (res.total || 0),
        loading: false,
      });
    } catch (e) {
      console.error('loadRecords error:', e);
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/index' }) });
  },
});
