const { getToken, removeToken } = require('../../utils/auth');
const { get, resolveImageUrl } = require('../../utils/request');
const { checkPopup } = require('../../utils/popup');

Page({
  data: {
    navPaddingTop: 20,
    isLoggedIn: false,
    userInfo: null,
    unreadCount: 0,
    popupVisible: false,
    popupData: null,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    // 检查登录状态
    const token = getToken();
    if (token) {
      this.setData({ isLoggedIn: true });
      this.loadProfile();
      this.loadUnreadCount();
    } else {
      this.setData({ isLoggedIn: false, userInfo: null, unreadCount: 0 });
      wx.navigateTo({ url: '/pages/login/index' });
    }
    this._checkPopup();
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });
  },

  async loadProfile() {
    try {
      const [profile, creditsData, recordsData, statsData] = await Promise.all([
        get('/auth/profile'),
        get('/checkin/my-credits').catch(() => ({ credits: 0 })),
        get('/checkin/my-records?pageSize=1').catch(() => ({ total: 0 })),
        get('/auth/my-stats').catch(() => ({ courseCount: 0, noteCount: 0, likeCount: 0 })),
      ]);
      this.setData({
        userInfo: {
          avatarUrl: profile.avatar ? resolveImageUrl(profile.avatar) : '',
          nickname: profile.nickname || `学员_${(profile.phone || '').slice(-4)}`,
          phone: (profile.phone && !profile.phone.startsWith('wx_')) ? profile.phone : '',
          role: profile.role || 'student',
          credit: creditsData.credits || 0,
          checkinCount: recordsData.total || 0,
          courseCount: statsData.courseCount || 0,
          noteCount: statsData.noteCount || 0,
          likeCount: statsData.likeCount || 0,
        },
      });
    } catch (e) {
      console.error('获取用户信息失败', e);
    }
  },

  async loadUnreadCount() {
    try {
      const res = await get('/notifications/unread-count');
      this.setData({ unreadCount: res.count || 0 });
    } catch (e) {
      // ignore
    }
  },

  goMessage() {
    wx.navigateTo({ url: '/pages/message/index' });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },

  goSettings() {
    wx.showToast({ title: '设置页开发中', icon: 'none' });
  },

  goEditProfile() {
    wx.navigateTo({ url: '/pages/profile/edit/index' });
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          removeToken();
          this.setData({ isLoggedIn: false, userInfo: null });
          wx.showToast({ title: '已退出登录', icon: 'none' });
        }
      },
    });
  },

  goStudyCourses() {
    wx.switchTab({ url: '/pages/study/index' });
  },

  goMyNotes() {
    if (!getToken()) return wx.navigateTo({ url: '/pages/login/index' });
    wx.navigateTo({ url: '/pages/note/list/index' });
  },

  goMyFavorites() {
    if (!getToken()) return wx.navigateTo({ url: '/pages/login/index' });
    wx.navigateTo({ url: '/pages/note/favorites/index' });
  },

  goOrders() {
    if (!getToken()) return wx.navigateTo({ url: '/pages/login/index' });
    wx.navigateTo({ url: '/pages/order/list/index' });
  },

  goCoupons() {
    wx.showToast({ title: '优惠券开发中', icon: 'none' });
  },

  goApplyTeacher() {
    wx.navigateTo({ url: '/pages/apply/teacher/index' });
  },

  goApplyVenue() {
    wx.navigateTo({ url: '/pages/apply/venue/index' });
  },

  contactService() {
    wx.makePhoneCall({
      phoneNumber: '400-000-000',
      fail() {},
    });
  },

  goFeedback() {
    if (!getToken()) return wx.navigateTo({ url: '/pages/login/index' });
    wx.navigateTo({ url: '/pages/feedback/index' });
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/about/index' });
  },

  goCredits() {
    if (!getToken()) return wx.navigateTo({ url: '/pages/login/index' });
    wx.navigateTo({ url: '/pages/credits/index' });
  },

  goCheckinRecords() {
    if (!getToken()) return wx.navigateTo({ url: '/pages/login/index' });
    wx.showToast({ title: '打卡记录开发中', icon: 'none' });
  },

  goMyTrials() {
    if (!getToken()) return wx.navigateTo({ url: '/pages/login/index' });
    wx.navigateTo({ url: '/pages/trial/list/index' });
  },

  async _checkPopup() {
    const popup = await checkPopup('/pages/mine/index');
    if (popup) {
      this.setData({ popupVisible: true, popupData: popup });
    }
  },

  onPopupClose() {
    this.setData({ popupVisible: false });
  },
});
