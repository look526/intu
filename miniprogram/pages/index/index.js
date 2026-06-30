const { get, resolveImageUrl } = require('../../utils/request');
const { checkPopup } = require('../../utils/popup');

Page({
  data: {
    navPaddingTop: 20,
    banners: [],
    categories: [],
    courses: [],
    featuredTeachers: [],
    courseCategories: [],
    rankingList: [],
    rankFilter: 'all',
    rankCategoryId: '',
    popupVisible: false,
    popupData: null,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this._checkPopup();
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });
    this.loadBanners();
    this.loadQuickLinks();
    this.loadRecommendedCourses();
    this.loadFeaturedTeachers();
    this.loadCourseCategories();
    this.loadRanking();
  },

  async loadBanners() {
    try {
      const res = await get('/system-config/banners');
      if (Array.isArray(res)) {
        const banners = res.map(item => ({
          ...item,
          imageUrl: resolveImageUrl(item.imageUrl),
        }));
        this.setData({ banners });
      }
    } catch (e) {
      console.error('[loadBanners]', e);
    }
  },

  async loadQuickLinks() {
    try {
      const res = await get('/system-config/home_quick_links');
      if (Array.isArray(res)) {
        const published = res.filter(item => item.status !== 'offline').map(item => ({
          ...item,
          iconUrl: item.iconUrl ? resolveImageUrl(item.iconUrl) : '',
        }));
        this.setData({ categories: published });
      }
    } catch (e) {
      console.error('[loadQuickLinks]', e);
    }
  },

  async loadRecommendedCourses() {
    try {
      const res = await get('/courses/recommended');
      if (Array.isArray(res)) {
        this.setData({ courses: res });
      }
    } catch (e) {
      console.error('[loadRecommendedCourses]', e);
    }
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/index' });
  },

  onCategoryTap(e) {
    const linkUrl = e.currentTarget.dataset.linkUrl;
    if (!linkUrl) return;

    // 解析 linkUrl 中的 categoryId 参数
    const match = linkUrl.match(/[?&]categoryId=(\d+)/);
    if (match && linkUrl.indexOf('/pages/course/list/index') !== -1) {
      // 选课页是 tabBar 页面，通过 globalData 传递分类 ID
      const app = getApp();
      app.globalData.pendingCategoryId = match[1];
      wx.switchTab({ url: '/pages/course/list/index' });
    } else {
      wx.navigateTo({ url: linkUrl });
    }
  },

  onBannerTap(e) {
    const index = e.currentTarget.dataset.index;
    const banner = this.data.banners[index];
    if (!banner || !banner.linkUrl) return;

    const { linkType, linkUrl } = banner;

    if (linkType === 'h5') {
      // H5 网页：跳转 webview 页面
      wx.navigateTo({
        url: `/pages/webview/index?url=${encodeURIComponent(linkUrl)}&title=${encodeURIComponent(banner.title || '')}`,
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

  goAllCourses() {
    wx.switchTab({ url: '/pages/course/list/index' });
  },

  goCourseDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/course/detail/index?id=${id}` });
  },

  async loadFeaturedTeachers() {
    try {
      const res = await get('/teachers/featured');
      if (Array.isArray(res)) {
        const teachers = res.map(t => ({
          ...t,
          avatar: t.avatar ? resolveImageUrl(t.avatar) : '',
        }));
        this.setData({ featuredTeachers: teachers });
      }
    } catch (e) {
      console.error('[loadFeaturedTeachers]', e);
    }
  },

  goTeacherDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/teacher/detail/index?id=${id}` });
  },

  async loadCourseCategories() {
    try {
      const res = await get('/course-categories');
      if (Array.isArray(res)) {
        this.setData({ courseCategories: res });
      }
    } catch (e) {
      console.error('[loadCourseCategories]', e);
    }
  },

  async loadRanking() {
    try {
      let url = '/class-groups/ranking';
      const params = [];
      if (this.data.rankCategoryId) {
        params.push(`categoryId=${this.data.rankCategoryId}`);
      }
      if (params.length) url += '?' + params.join('&');
      const res = await get(url);
      if (Array.isArray(res)) {
        const list = res.map(item => ({
          ...item,
          checkinRateText: (item.checkinRate * 100).toFixed(0) + '%',
        }));
        this.setData({ rankingList: list });
      }
    } catch (e) {
      console.error('[loadRanking]', e);
    }
  },

  onRankFilterTap(e) {
    const { type, id } = e.currentTarget.dataset;
    if (type === 'all') {
      this.setData({ rankFilter: 'all', rankCategoryId: '' });
    } else {
      this.setData({ rankFilter: id, rankCategoryId: id });
    }
    this.loadRanking();
  },

  async _checkPopup() {
    const popup = await checkPopup('/pages/index/index');
    if (popup) {
      this.setData({ popupVisible: true, popupData: popup });
    }
  },

  onPopupClose() {
    this.setData({ popupVisible: false });
  },
});
