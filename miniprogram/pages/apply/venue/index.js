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
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    trafficInfo: '',
    area: '',
    photos: [],       // 完整 URL（用于显示）
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
      const app = await get('/venue-applications/my');
      if (!app) {
        this.setData({ showForm: true });
        return;
      }
      if (app.status === 'pending') {
        this.setData({ applicationStatus: 'pending', showForm: false });
      } else if (app.status === 'approved') {
        this.setData({ applicationStatus: 'approved', showForm: false });
      } else if (app.status === 'rejected') {
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
    }
  },

  reapply() {
    const app = this.data.lastApplication;
    this.setData({
      showForm: true,
      applicationStatus: '',
      name: app?.name || '',
      address: app?.address || '',
      latitude: app?.latitude || 0,
      longitude: app?.longitude || 0,
      trafficInfo: app?.trafficInfo || '',
      area: app?.area ? String(app.area) : '',
      photos: (app?.photos || []).map(u => resolveImageUrl(u)),
    });
  },

  applyNewVenue() {
    this.setData({
      showForm: true,
      applicationStatus: '',
      name: '',
      address: '',
      latitude: 0,
      longitude: 0,
      trafficInfo: '',
      area: '',
      photos: [],
    });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/index' }) });
  },

  // ===== 表单输入 =====
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  // ===== 选择位置 =====
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          address: res.address || res.name || '',
          latitude: res.latitude,
          longitude: res.longitude,
        });
      },
      fail: (err) => {
        // 用户取消或权限问题
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          wx.showToast({ title: '请授权位置权限', icon: 'none' });
        }
      },
    });
  },

  // ===== 上传场地照片（多图） =====
  choosePhotos() {
    const remain = 9 - this.data.photos.length;
    if (remain <= 0) return wx.showToast({ title: '最多9张照片', icon: 'none' });
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = res.tempFiles.map((f) => f.tempFilePath);
        this.uploadMultipleFiles(files).then((urls) => {
          this.setData({
            photos: this.data.photos.concat(urls.map(u => resolveImageUrl(u))),
          });
        });
      },
    });
  },

  // ===== 删除图片 =====
  removePhoto(e) {
    const idx = e.currentTarget.dataset.idx;
    const arr = this.data.photos.filter((_, i) => i !== idx);
    this.setData({ photos: arr });
  },

  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({ current, urls });
  },

  // ===== 通用上传方法 =====
  async uploadFile(filePath) {
    const app = getApp();
    const baseUrl = app.globalData.baseUrl;
    const token = getToken();

    return new Promise((resolve) => {
      wx.uploadFile({
        url: `${baseUrl}/upload`,
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

  async uploadMultipleFiles(filePaths) {
    const urls = [];
    for (const fp of filePaths) {
      const url = await this.uploadFile(fp);
      if (url) urls.push(url);
    }
    return urls;
  },

  // ===== 提交申请 =====
  async submitApplication() {
    const { name, address, latitude, longitude, trafficInfo, area, photos } = this.data;

    if (!name.trim()) return wx.showToast({ title: '请输入场地名称', icon: 'none' });
    if (!address.trim()) return wx.showToast({ title: '请选择场地地址', icon: 'none' });
    if (!latitude || !longitude) return wx.showToast({ title: '请通过地图选择场地位置', icon: 'none' });
    if (photos.length === 0) return wx.showToast({ title: '请上传至少一张场地照片', icon: 'none' });

    if (this.data.submitting) return;
    this.setData({ submitting: true });

    try {
      await post('/venue-applications', {
        name: name.trim(),
        address: address.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        trafficInfo: trafficInfo.trim() || undefined,
        area: area ? Number(area) : undefined,
        photos: photos.map(u => toRelativeUrl(u)),
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
