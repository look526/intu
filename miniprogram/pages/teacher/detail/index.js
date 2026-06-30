const { get, resolveImageUrl } = require('../../../utils/request');

Page({
  data: {
    navPaddingTop: 20,
    teacher: null,
    loading: true,
    // 展开/收起简介
    bioExpanded: false,
    // 作品集预览
    portfolioImages: [],
    certificateImages: [],
  },

  onLoad(options) {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });
    if (options.id) {
      this.loadTeacher(options.id);
    }
  },

  async loadTeacher(id) {
    try {
      const data = await get(`/teachers/${id}`);
      // 处理图片URL
      const teacher = {
        ...data,
        avatarUrl: data.avatarUrl ? resolveImageUrl(data.avatarUrl) : '',
        introVideoUrl: data.introVideoUrl ? resolveImageUrl(data.introVideoUrl) : '',
        ratingText: Number(data.rating).toFixed(1),
        specialtiesList: (data.specialties || '').split(',').filter(s => s.trim()),
        teachingYearsText: data.teachingYears ? `${data.teachingYears}年教学经验` : '',
        courses: (data.courses || []).map(c => ({
          ...c,
          coverImage: c.coverImage ? resolveImageUrl(c.coverImage) : '',
        })),
      };

      const portfolioImages = (data.portfolioUrls || []).map(u => resolveImageUrl(u));
      const certificateImages = (data.certificateUrls || []).map(u => resolveImageUrl(u));

      this.setData({ teacher, portfolioImages, certificateImages, loading: false });
    } catch (e) {
      console.error('[loadTeacher]', e);
      this.setData({ loading: false });
      wx.showToast({ title: '教师信息不存在', icon: 'none' });
    }
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  toggleBio() {
    this.setData({ bioExpanded: !this.data.bioExpanded });
  },

  previewPortfolio(e) {
    const idx = e.currentTarget.dataset.idx;
    wx.previewImage({
      current: this.data.portfolioImages[idx],
      urls: this.data.portfolioImages,
    });
  },

  previewCertificate(e) {
    const idx = e.currentTarget.dataset.idx;
    wx.previewImage({
      current: this.data.certificateImages[idx],
      urls: this.data.certificateImages,
    });
  },

  goCourseDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/course/detail/index?id=${id}` });
  },

  onConsult() {
    wx.makePhoneCall({ phoneNumber: '400-000-000', fail() {} });
  },
});
