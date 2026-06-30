const { get, post, resolveImageUrl } = require('../../../utils/request');
const { getToken } = require('../../../utils/auth');
const { subscribeByScene } = require('../../../utils/subscribe');

/** 将完整 URL 还原为相对路径（提交时存相对路径） */
function toRelativeUrl(fullUrl) {
  if (!fullUrl) return '';
  const app = getApp();
  const base = app.globalData.baseUrl;
  if (fullUrl.startsWith(base)) return fullUrl.slice(base.length);
  return fullUrl;
}

Page({
  data: {
    navPaddingTop: 20,
    // 表单
    realName: '',
    phone: '',
    specialties: '',
    teachingYears: 0,
    teachingYearsText: '',
    yearOptions: Array.from({ length: 30 }, (_, i) => `${i + 1}年`),
    bio: '',
    avatarUrl: '',
    certificateImages: [],
    portfolioImages: [],
    introVideoUrl: '',
    submitting: false,
    // 状态
    showForm: false,
    applicationStatus: '', // pending | approved | rejected | ''
    auditRemark: '',
    lastApplication: null,
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });
    this.checkStatus();
  },

  async checkStatus() {
    if (!getToken()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    try {
      const app = await get('/teacher-applications/my');
      if (!app) {
        // 无申请记录，显示表单
        this.setData({ showForm: true });
        this.prefillPhone();
        return;
      }
      if (app.status === 'pending') {
        this.setData({ applicationStatus: 'pending', showForm: false });
      } else if (app.status === 'approved') {
        this.setData({ applicationStatus: 'approved', showForm: false });
      } else if (app.status === 'rejected') {
        // 被驳回，显示驳回信息 + 允许重新申请
        this.setData({
          applicationStatus: 'rejected',
          auditRemark: app.auditRemark || '',
          lastApplication: app,
          showForm: false,
        });
      }
    } catch (err) {
      console.error('checkStatus error:', err);
      this.setData({ showForm: true });
      this.prefillPhone();
    }
  },

  async prefillPhone() {
    try {
      const profile = await get('/auth/profile');
      // 微信登录用户 phone 是 wx_ 前缀的假号码，过滤掉
      const phone = (profile.phone && !profile.phone.startsWith('wx_')) ? profile.phone : '';
      this.setData({ phone });
    } catch (e) {
      // ignore
    }
  },

  reapply() {
    const app = this.data.lastApplication;
    this.setData({
      showForm: true,
      applicationStatus: '',
      realName: app?.realName || '',
      specialties: app?.specialties || '',
      teachingYears: app?.teachingYears || 0,
      teachingYearsText: app?.teachingYears ? `${app.teachingYears}年` : '',
      bio: app?.bio || '',
      avatarUrl: app?.avatarUrl ? resolveImageUrl(app.avatarUrl) : '',
      certificateImages: (app?.certificateUrls || []).map(u => resolveImageUrl(u)),
      portfolioImages: (app?.portfolioUrls || []).map(u => resolveImageUrl(u)),
      introVideoUrl: app?.introVideoUrl ? resolveImageUrl(app.introVideoUrl) : '',
    });
    this.prefillPhone();
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/index' }) });
  },

  // ===== 表单输入 =====
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  onYearsChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      teachingYears: idx + 1,
      teachingYearsText: `${idx + 1}年`,
    });
  },

  // ===== 上传：形象照 =====
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFiles[0].tempFilePath;
        this.uploadFile(filePath, 'image').then((url) => {
          if (url) this.setData({ avatarUrl: resolveImageUrl(url) });
        });
      },
    });
  },

  // ===== 上传：证书照片 =====
  chooseCertificates() {
    const remain = 6 - this.data.certificateImages.length;
    if (remain <= 0) return wx.showToast({ title: '最多6张证书', icon: 'none' });
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = res.tempFiles.map((f) => f.tempFilePath);
        this.uploadMultipleFiles(files, 'image').then((urls) => {
          this.setData({ certificateImages: this.data.certificateImages.concat(urls.map(u => resolveImageUrl(u))) });
        });
      },
    });
  },

  // ===== 上传：作品照片 =====
  choosePortfolio() {
    const remain = 9 - this.data.portfolioImages.length;
    if (remain <= 0) return wx.showToast({ title: '最多9张作品', icon: 'none' });
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = res.tempFiles.map((f) => f.tempFilePath);
        this.uploadMultipleFiles(files, 'image').then((urls) => {
          this.setData({ portfolioImages: this.data.portfolioImages.concat(urls.map(u => resolveImageUrl(u))) });
        });
      },
    });
  },

  // ===== 上传：视频 =====
  chooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 180,
      success: (res) => {
        const filePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '视频上传中...' });
        this.uploadFile(filePath, 'video').then((url) => {
          wx.hideLoading();
          if (url) {
            const fullUrl = resolveImageUrl(url);
            console.log('[chooseVideo] uploaded url:', url, '=> fullUrl:', fullUrl);
            this.setData({ introVideoUrl: fullUrl });
          }
        }).catch(() => wx.hideLoading());
      },
    });
  },

  // ===== 删除图片 =====
  removeImage(e) {
    const { type, idx } = e.currentTarget.dataset;
    if (type === 'certificate') {
      const arr = this.data.certificateImages.filter((_, i) => i !== idx);
      this.setData({ certificateImages: arr });
    } else if (type === 'portfolio') {
      const arr = this.data.portfolioImages.filter((_, i) => i !== idx);
      this.setData({ portfolioImages: arr });
    } else if (type === 'avatar') {
      this.setData({ avatarUrl: '' });
    } else if (type === 'video') {
      this.setData({ introVideoUrl: '' });
    }
  },

  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    const resolvedUrls = urls.map((u) => resolveImageUrl(u));
    wx.previewImage({ current: resolveImageUrl(current), urls: resolvedUrls });
  },

  // ===== 通用上传方法 =====
  async uploadFile(filePath, type) {
    const app = getApp();
    const baseUrl = app.globalData.baseUrl;
    const token = getToken();
    const endpoint = type === 'video' ? '/upload/video' : '/upload';

    return new Promise((resolve) => {
      wx.uploadFile({
        url: `${baseUrl}${endpoint}`,
        filePath,
        name: 'file',
        header: { Authorization: token ? `Bearer ${token}` : '' },
        success: (r) => {
          if (r.statusCode >= 200 && r.statusCode < 300) {
            const data = JSON.parse(r.data);
            resolve(data.url || '');
          } else {
            wx.showToast({ title: '上传失败', icon: 'none' });
            resolve('');
          }
        },
        fail: () => {
          wx.showToast({ title: '上传失败', icon: 'none' });
          resolve('');
        },
      });
    });
  },

  async uploadMultipleFiles(filePaths, type) {
    const urls = [];
    for (const fp of filePaths) {
      const url = await this.uploadFile(fp, type);
      if (url) urls.push(url);
    }
    return urls;
  },

  // ===== 提交申请 =====
  async submitApplication() {
    const { realName, phone, specialties, teachingYears, bio, avatarUrl, certificateImages, portfolioImages, introVideoUrl } = this.data;

    if (!realName.trim()) return wx.showToast({ title: '请输入真实姓名', icon: 'none' });
    if (!phone.trim()) return wx.showToast({ title: '请输入联系电话', icon: 'none' });
    if (!specialties.trim()) return wx.showToast({ title: '请输入擅长领域', icon: 'none' });
    if (!teachingYears) return wx.showToast({ title: '请选择教学经验', icon: 'none' });
    if (!avatarUrl) return wx.showToast({ title: '请上传个人形象照', icon: 'none' });
    if (certificateImages.length === 0) return wx.showToast({ title: '请上传至少一张资质证书', icon: 'none' });

    if (this.data.submitting) return;
    this.setData({ submitting: true });

    try {
      await post('/teacher-applications', {
        realName: realName.trim(),
        phone: phone.trim(),
        specialties: specialties.trim(),
        teachingYears,
        bio: bio.trim() || undefined,
        avatarUrl: toRelativeUrl(avatarUrl),
        certificateUrls: certificateImages.map(u => toRelativeUrl(u)),
        portfolioUrls: portfolioImages.length > 0 ? portfolioImages.map(u => toRelativeUrl(u)) : undefined,
        introVideoUrl: toRelativeUrl(introVideoUrl) || undefined,
      });

      // 请求订阅消息授权（审核结果通知）
      await subscribeByScene('application');

      this.setData({ applicationStatus: 'pending', showForm: false });
      wx.showToast({ title: '申请已提交', icon: 'success' });
    } catch (err) {
      console.error('submitApplication error:', err);
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
