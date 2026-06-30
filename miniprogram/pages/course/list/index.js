const { get } = require('../../../utils/request');
const { checkPopup } = require('../../../utils/popup');

Page({
  data: {
    navPaddingTop: 20,
    activeCategory: 'all',
    categories: [
      { id: 'all', name: '全部' },
    ],
    courses: [],
    filteredCourses: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    popupVisible: false,
    popupData: null,
  },

  onLoad(options) {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });
    this.loadCategories();
    const category = options.category || 'all';
    this.setData({ activeCategory: category });
    this.loadCourses(true);
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    // 检查金刚区跳转带过来的分类 ID
    const app = getApp();
    const pendingId = app.globalData.pendingCategoryId;
    if (pendingId) {
      app.globalData.pendingCategoryId = null;
      const catId = String(pendingId);
      if (catId !== this.data.activeCategory) {
        this.setData({ activeCategory: catId, courses: [], filteredCourses: [], page: 1, hasMore: true });
        this.loadCourses(true);
      }
    }
    this._checkPopup();
  },

  async loadCategories() {
    try {
      const data = await get('/course-categories');
      const categories = [
        { id: 'all', name: '全部' },
        ...data.map(item => ({ id: String(item.id), name: item.name })),
      ];
      this.setData({ categories });
    } catch (e) {
      console.error('加载分类失败', e);
    }
  },

  async loadCourses(reset = false) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    try {
      const params = {
        page,
        pageSize: this.data.pageSize,
        status: 'published',
      };
      const catId = this.data.activeCategory;
      if (catId !== 'all') {
        params.categoryId = parseInt(catId, 10);
      }
      const res = await get('/courses', params);
      const newItems = res.items || [];
      const courses = reset ? newItems : [...this.data.courses, ...newItems];
      this.setData({
        courses,
        filteredCourses: courses,
        page: page + 1,
        hasMore: courses.length < res.total,
      });
    } catch (e) {
      console.error('加载课程失败', e);
    } finally {
      this.setData({ loading: false });
    }
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeCategory: id, courses: [], filteredCourses: [], page: 1, hasMore: true });
    this.loadCourses(true);
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/index' });
  },

  toggleFilter() {
    wx.showToast({ title: '筛选功能开发中', icon: 'none' });
  },

  goCourseDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/course/detail/index?id=${id}` });
  },

  onTrialTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/course/detail/index?id=${id}&trial=1` });
  },

  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadCourses(false);
    }
  },

  async _checkPopup() {
    const popup = await checkPopup('/pages/course/list/index');
    if (popup) {
      this.setData({ popupVisible: true, popupData: popup });
    }
  },

  onPopupClose() {
    this.setData({ popupVisible: false });
  },
});
