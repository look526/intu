const { get, post } = require('../../../utils/request');
const { getToken } = require('../../../utils/auth');

Page({
  data: {
    navPaddingTop: 20,
    course: null,
    loading: true,
    showTrialModal: false,
    isLoggedIn: false,
    trialSuccess: false,
    showOrderModal: false,
    ordering: false,
    today: '',
    trialForm: { name: '', phone: '', date: '' },
    submittingTrial: false,
    reviews: [],
    reviewTotal: 0,
  },

  onLoad(options) {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });

    // 设置今天日期作为 picker 最小值
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.setData({ today });

    if (options.id) {
      this.loadCourse(options.id);
      this.loadReviews(options.id);
    }
  },

  async loadCourse(id) {
    try {
      const course = await get(`/courses/${id}`);
      this.setData({ course, loading: false });
      wx.setNavigationBarTitle({ title: course.name });
    } catch (e) {
      console.error('加载课程详情失败', e);
      this.setData({ loading: false });
      wx.showToast({ title: '课程不存在', icon: 'none' });
    }
  },

  async loadReviews(courseId) {
    try {
      const res = await get(`/reviews/course/${courseId}`, { page: 1, pageSize: 10 });
      const reviews = (res.items || []).map((r) => {
        const created = new Date(r.createdAt);
        const dateStr = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;
        return {
          id: r.id,
          nickname: r.student?.user?.nickname || '匿名',
          avatar: r.student?.user?.avatar || '',
          rating: r.rating,
          content: r.content || '',
          date: dateStr,
        };
      });
      this.setData({ reviews, reviewTotal: res.total || 0 });
    } catch (e) {
      console.error('loadReviews error:', e);
    }
  },

  goBack() {
    wx.navigateBack();
  },

  noop() {},

  // 咨询 - 拨打电话
  onConsult() {
    wx.makePhoneCall({
      phoneNumber: '400-000-000',
      fail() {},
    });
  },

  // 点击授课教师卡片
  goTeacherDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/teacher/detail/index?id=${id}` });
  },

  // 免费试听
  onTrial() {
    const token = getToken();
    if (token) {
      const app = getApp();
      const userInfo = app.globalData.userInfo || {};
      const hasPhone = !!(userInfo.phone && userInfo.phone.trim());
      if (hasPhone) {
        // 已登录且有手机号：直接成功
        this.setData({ isLoggedIn: true, needPhone: false, showTrialModal: true, trialSuccess: true });
        this._sendTrialAsync();
      } else {
        // 已登录但无手机号：弹出手机号输入
        this.setData({ isLoggedIn: true, needPhone: true, showTrialModal: true, trialSuccess: false });
      }
    } else {
      // 未登录用户：显示完整表单
      this.setData({ isLoggedIn: false, needPhone: false, showTrialModal: true, trialSuccess: false });
    }
  },

  closeTrialModal() {
    this.setData({ showTrialModal: false, trialSuccess: false, needPhone: false });
  },

  onTrialNameInput(e) {
    this.setData({ 'trialForm.name': e.detail.value });
  },

  onTrialPhoneInput(e) {
    this.setData({ 'trialForm.phone': e.detail.value });
  },

  onTrialDateChange(e) {
    this.setData({ 'trialForm.date': e.detail.value });
  },

  // 异步发送试听预约（已登录用户，后台静默发送）
  _sendTrialAsync(phone) {
    const app = getApp();
    const userInfo = app.globalData.userInfo || {};
    post('/trial-bookings', {
      courseId: this.data.course.id,
      name: userInfo.nickname || '已登录用户',
      phone: phone || userInfo.phone || '',
    }).catch((e) => console.error('试听预约后台发送失败', e));
  },

  // 已登录但无手机号：提交手机号后预约
  async submitPhone() {
    const { phone } = this.data.trialForm;
    if (!/^1\d{10}$/.test(phone)) {
      return wx.showToast({ title: '请输入正确手机号', icon: 'none' });
    }
    this.setData({ trialSuccess: true });
    this._sendTrialAsync(phone);
  },

  // 未登录用户：提交完整表单
  async submitTrial() {
    if (this.data.submittingTrial) return;
    const { name, phone } = this.data.trialForm;

    if (!name.trim()) {
      return wx.showToast({ title: '请输入您的称呼', icon: 'none' });
    }
    if (!/^1\d{10}$/.test(phone)) {
      return wx.showToast({ title: '请输入正确手机号', icon: 'none' });
    }

    this.setData({ submittingTrial: true });
    try {
      await post('/trial-bookings', {
        courseId: this.data.course.id,
        name: name.trim(),
        phone,
      });
      this.setData({
        trialSuccess: true,
        trialForm: { name: '', phone: '', date: '' },
      });
    } catch (e) {
      console.error('提交试听预约失败', e);
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submittingTrial: false });
    }
  },

  // 购买 - 检查登录后弹出确认弹窗
  onBuy() {
    const course = this.data.course;
    if (!course) return;
    if (!getToken()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    this.setData({ showOrderModal: true });
  },

  closeOrderModal() {
    this.setData({ showOrderModal: false });
  },

  async confirmOrder() {
    if (this.data.ordering) return;
    this.setData({ ordering: true });
    try {
      const res = await post('/orders', { courseId: this.data.course.id });
      wx.showToast({ title: '下单成功', icon: 'success' });
      this.setData({ showOrderModal: false });
      setTimeout(() => {
        wx.navigateTo({ url: `/pages/order/detail/index?orderId=${res.id}` });
      }, 500);
    } catch (e) {
      console.error('下单失败', e);
    } finally {
      this.setData({ ordering: false });
    }
  },
});
