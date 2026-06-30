const { get, put } = require('../../utils/request');
const { getToken } = require('../../utils/auth');

Page({
  data: {
    navPaddingTop: 20,
    isLoggedIn: false,
    notifications: [],
    page: 1,
    hasMore: true,
    loading: false,
    unreadCount: 0,
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });
  },

  onShow() {
    const token = getToken();
    this.setData({ isLoggedIn: !!token });
    if (token) {
      this.loadNotifications(true);
      this.loadUnreadCount();
    } else {
      this.setData({ notifications: [], unreadCount: 0 });
    }
  },

  async loadNotifications(reset = false) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    if (!reset && !this.data.hasMore) return;
    this.setData({ loading: true });
    try {
      const res = await get('/notifications', { page, pageSize: 20 });
      const items = (res.items || []).map((n) => this.mapNotification(n));
      this.setData({
        notifications: reset ? items : this.data.notifications.concat(items),
        page: page + 1,
        hasMore: items.length >= 20,
      });
    } catch (err) {
      console.error('loadNotifications error:', err);
    } finally {
      this.setData({ loading: false });
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

  mapNotification(n) {
    // 时间格式化
    const now = Date.now();
    const created = new Date(n.createdAt).getTime();
    const diff = now - created;
    let timeAgo;
    if (diff < 60000) timeAgo = '刚刚';
    else if (diff < 3600000) timeAgo = Math.floor(diff / 60000) + '分钟前';
    else if (diff < 86400000) timeAgo = Math.floor(diff / 3600000) + '小时前';
    else if (diff < 604800000) timeAgo = Math.floor(diff / 86400000) + '天前';
    else {
      const d = new Date(n.createdAt);
      timeAgo = `${d.getMonth() + 1}/${d.getDate()}`;
    }

    // 通知类型图标颜色
    const typeColorMap = {
      order_paid: '#10b981',
      teacher_application_result: '#8b5cf6',
      venue_application_result: '#8b5cf6',
      class_assigned: '#3b82f6',
      class_started: '#2563eb',
      checkin_success: '#f59e0b',
      class_reminder: '#ef4444',
    };

    // 通知类型图标文字
    const typeIconMap = {
      order_paid: '¥',
      teacher_application_result: '审',
      venue_application_result: '审',
      class_assigned: '班',
      class_started: '课',
      checkin_success: '✓',
      class_reminder: '⏰',
    };

    return {
      id: n.id,
      type: n.type,
      title: n.title,
      content: n.content,
      isRead: n.isRead,
      timeAgo,
      extra: n.extra || {},
      iconColor: typeColorMap[n.type] || '#6b7280',
      iconText: typeIconMap[n.type] || '通',
    };
  },

  async onTapNotification(e) {
    const { id, idx } = e.currentTarget.dataset;
    const notification = this.data.notifications[idx];
    if (!notification) return;

    // 标记已读
    if (!notification.isRead) {
      try {
        await put(`/notifications/${id}/read`);
        const key = `notifications[${idx}].isRead`;
        this.setData({ [key]: true, unreadCount: Math.max(0, this.data.unreadCount - 1) });
      } catch (e) {
        // ignore
      }
    }

    // 跳转落地页
    const targetUrl = notification.extra?.targetUrl;
    if (targetUrl) {
      wx.navigateTo({
        url: targetUrl,
        fail: () => {
          // 可能是 tabBar 页面
          wx.switchTab({ url: targetUrl, fail: () => {} });
        },
      });
    }
  },

  async markAllRead() {
    if (this.data.unreadCount === 0) return;
    try {
      await put('/notifications/read-all');
      const notifications = this.data.notifications.map((n) => ({ ...n, isRead: true }));
      this.setData({ notifications, unreadCount: 0 });
      wx.showToast({ title: '已全部标为已读', icon: 'success' });
    } catch (err) {
      console.error('markAllRead error:', err);
    }
  },

  onPullDownRefresh() {
    this.loadNotifications(true).then(() => {
      this.loadUnreadCount();
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadNotifications(false);
    }
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/index' }) });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },
});
