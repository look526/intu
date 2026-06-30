const { post, patch } = require('../../utils/request');
const { getToken, setToken } = require('../../utils/auth');

/** 将完整 URL 转为相对路径供后端存储 */
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
    phone: '',
    code: '',
    countdown: 0,
    codeSent: false,
    loading: false,
    showPhoneLogin: false,
    showProfileModal: false,
    tempAvatarUrl: '',
    tempNickname: '',
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });
    // 如果已登录，直接返回
    if (getToken()) {
      wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/index' }) });
    }
  },

  togglePhoneLogin() {
    this.setData({ showPhoneLogin: true });
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value });
  },

  // ========== 微信一键登录 ==========
  async onWxLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const { code } = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });
      // 开发模式：生成持久化 devOpenid，确保同一设备每次登录都是同一用户
      let devOpenid = wx.getStorageSync('__dev_openid__');
      if (!devOpenid) {
        devOpenid = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        wx.setStorageSync('__dev_openid__', devOpenid);
      }
      console.log('[WX-LOGIN] devOpenid:', devOpenid);
      const res = await post('/auth/wx-login', { code, devOpenid });
      console.log('[WX-LOGIN] response:', JSON.stringify(res));
      setToken(res.access_token);
      if (res.needProfile) {
        this.setData({ loading: false, showProfileModal: true });
        return;
      }
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/index' }) });
      }, 500);
    } catch (e) {
      console.error('微信登录失败', e);
      wx.showToast({ title: '微信登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // ========== 发送验证码 ==========
  async onSendCode() {
    const { phone, countdown } = this.data;
    if (countdown > 0) return;
    if (!/^1\d{10}$/.test(phone)) {
      return wx.showToast({ title: '请输入正确手机号', icon: 'none' });
    }
    try {
      await post('/auth/send-code', { phone });
      wx.showToast({ title: '验证码已发送', icon: 'none' });
      this.setData({ codeSent: true });
      this.startCountdown();
    } catch (e) {
      console.error('发送验证码失败', e);
    }
  },

  startCountdown() {
    this.setData({ countdown: 60 });
    this._timer = setInterval(() => {
      const c = this.data.countdown - 1;
      if (c <= 0) {
        clearInterval(this._timer);
        this.setData({ countdown: 0 });
      } else {
        this.setData({ countdown: c });
      }
    }, 1000);
  },

  // ========== 手机验证码登录 ==========
  async onPhoneLogin() {
    const { phone, code, loading } = this.data;
    if (loading) return;
    if (!/^1\d{10}$/.test(phone)) {
      return wx.showToast({ title: '请输入正确手机号', icon: 'none' });
    }
    if (!code || code.length < 4) {
      return wx.showToast({ title: '请输入验证码', icon: 'none' });
    }
    this.setData({ loading: true });
    try {
      const res = await post('/auth/phone-login', { phone, code });
      setToken(res.access_token);
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/index' }) });
      }, 500);
    } catch (e) {
      console.error('手机登录失败', e);
    } finally {
      this.setData({ loading: false });
    }
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer);
  },

  // ========== 资料填写 ==========
  onChooseAvatar(e) {
    const tempPath = e.detail.avatarUrl;
    console.log('[PROFILE] avatar selected:', tempPath);
    // 先上传到服务器，再保存服务端URL
    this.uploadFile(tempPath).then((url) => {
      if (url) {
        console.log('[PROFILE] avatar uploaded:', url);
        this.setData({ tempAvatarUrl: url });
      } else {
        wx.showToast({ title: '头像上传失败', icon: 'none' });
      }
    });
  },

  onNicknameInput(e) {
    console.log('[PROFILE] nickname input:', e.detail.value);
    this.setData({ tempNickname: e.detail.value });
  },

  async saveProfile() {
    let { tempAvatarUrl, tempNickname } = this.data;

    // 安全处理：如果 tempNickname 为空，尝试从输入框取值（兑容 type="nickname" 的微信昵称快填问题）
    if (!tempNickname || !tempNickname.trim()) {
      // 尝试通过 createSelectorQuery 获取实际值
      try {
        const val = await new Promise((resolve) => {
          this.createSelectorQuery()
            .select('.nickname-input')
            .fields({ properties: ['value'] })
            .exec((res) => {
              resolve(res && res[0] && res[0].value ? res[0].value : '');
            });
        });
        if (val && val.trim()) {
          tempNickname = val;
          this.setData({ tempNickname: val });
        }
      } catch (e) {
        // ignore
      }
    }

    if (!tempNickname || !tempNickname.trim()) {
      return wx.showToast({ title: '请输入昵称', icon: 'none' });
    }
    try {
      wx.showLoading({ title: '保存中...' });
      const profileData = {
        nickname: tempNickname.trim(),
        avatar: toRelativeUrl(tempAvatarUrl) || '',
      };
      console.log('[PROFILE] saving:', JSON.stringify(profileData));
      await patch('/auth/profile', profileData);
      wx.hideLoading();
      wx.showToast({ title: '资料已保存', icon: 'success' });
      this.setData({ showProfileModal: false });
      setTimeout(() => {
        wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/index' }) });
      }, 500);
    } catch (e) {
      wx.hideLoading();
      console.error('保存资料失败', e);
    }
  },

  skipProfile() {
    this.setData({ showProfileModal: false });
    wx.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(() => {
      wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/index' }) });
    }, 500);
  },

  /** 上传文件到服务器，返回服务端 URL */
  uploadFile(filePath) {
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
});
