const { get, patch, resolveImageUrl } = require('../../../utils/request');
const { getToken } = require('../../../utils/auth');

function toRelativeUrl(url) {
  if (!url) return '';
  const app = getApp();
  const baseUrl = app.globalData.baseUrl;
  if (url.startsWith(baseUrl)) return url.replace(baseUrl, '');
  return url;
}

Page({
  data: {
    navPaddingTop: 20,
    avatarUrl: '',
    nickname: '',
    phone: '',
    saving: false,
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });
  },

  onShow() {
    this.loadProfile();
  },

  async loadProfile() {
    try {
      const profile = await get('/auth/profile');
      this.setData({
        avatarUrl: profile.avatar ? resolveImageUrl(profile.avatar) : '',
        nickname: profile.nickname || '',
        phone: (profile.phone && !profile.phone.startsWith('wx_')) ? profile.phone : '',
      });
    } catch (e) {
      console.error('加载个人信息失败', e);
    }
  },

  // 选择头像
  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFiles[0].tempFilePath;
        this.uploadFile(filePath).then((url) => {
          if (url) {
            this.setData({ avatarUrl: resolveImageUrl(url) });
          }
        });
      },
    });
  },

  // 昵称输入
  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  // 保存
  async onSave() {
    const { nickname, phone, avatarUrl } = this.data;

    if (!nickname.trim()) {
      return wx.showToast({ title: '请输入昵称', icon: 'none' });
    }

    if (phone && !/^1\d{10}$/.test(phone)) {
      return wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
    }

    this.setData({ saving: true });

    try {
      const data = {
        nickname: nickname.trim(),
        avatar: toRelativeUrl(avatarUrl),
        phone: phone || '',
      };
      await patch('/auth/profile', data);
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (e) {
      console.error('保存失败', e);
    } finally {
      this.setData({ saving: false });
    }
  },

  // 上传文件
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
          try {
            const data = JSON.parse(r.data);
            resolve(data.url || data.path || '');
          } catch {
            resolve('');
          }
        },
        fail: () => resolve(''),
      });
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
