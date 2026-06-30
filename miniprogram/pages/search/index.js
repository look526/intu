const { get } = require('../../utils/request');

let searchTimer = null;

Page({
  data: {
    navPaddingTop: 20,
    keyword: '',
    results: [],
    loading: false,
    searched: false,
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });
  },

  onInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });

    if (searchTimer) clearTimeout(searchTimer);

    if (!keyword.trim()) {
      this.setData({ results: [], searched: false });
      return;
    }

    searchTimer = setTimeout(() => {
      this.doSearch(keyword.trim());
    }, 300);
  },

  async doSearch(keyword) {
    this.setData({ loading: true, searched: true });
    try {
      const res = await get('/courses', { keyword, status: 'published', pageSize: 50 });
      this.setData({ results: res.items || [] });
    } catch (e) {
      console.error('搜索失败', e);
    } finally {
      this.setData({ loading: false });
    }
  },

  onClear() {
    this.setData({ keyword: '', results: [], searched: false });
  },

  goCourseDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/course/detail/index?id=${id}` });
  },

  goBack() {
    wx.navigateBack();
  },
});
