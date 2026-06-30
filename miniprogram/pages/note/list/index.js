const { get, del, resolveImageUrl } = require('../../../utils/request');
const { getToken } = require('../../../utils/auth');

Page({
  data: {
    navPaddingTop: 20,
    notes: [],
    loading: true,
    page: 1,
    pageSize: 10,
    hasMore: true,
    refreshing: false,
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });
    if (!getToken()) {
      wx.redirectTo({ url: '/pages/login/index' });
      return;
    }
    this.loadNotes();
  },

  onShow() {
    if (this._needRefresh) {
      this._needRefresh = false;
      this.setData({ page: 1, notes: [], hasMore: true });
      this.loadNotes();
    }
  },

  async loadNotes() {
    if (this.data.loading && this.data.page > 1) return;
    this.setData({ loading: true });
    try {
      const res = await get('/notes/my', {
        page: this.data.page,
        pageSize: this.data.pageSize,
      });
      const items = (res.items || []).map((n) => this.formatNote(n));
      const newNotes = this.data.page === 1 ? items : [...this.data.notes, ...items];
      this.setData({
        notes: newNotes,
        hasMore: items.length >= this.data.pageSize,
        loading: false,
        refreshing: false,
      });
    } catch (e) {
      console.error('加载笔记失败', e);
      this.setData({ loading: false, refreshing: false });
    }
  },

  formatNote(n) {
    // 处理图片 URL
    let images = [];
    if (n.images) {
      const arr = typeof n.images === 'string' ? JSON.parse(n.images) : n.images;
      images = (arr || []).map((url) => resolveImageUrl(url));
    }

    // 格式化时间
    const created = new Date(n.createdAt);
    const now = new Date();
    let dateStr;
    const diffMs = now - created;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) {
      dateStr = '刚刚';
    } else if (diffMin < 60) {
      dateStr = `${diffMin}分钟前`;
    } else if (diffMin < 1440) {
      dateStr = `${Math.floor(diffMin / 60)}小时前`;
    } else if (diffMin < 10080) {
      dateStr = `${Math.floor(diffMin / 1440)}天前`;
    } else {
      dateStr = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;
    }

    return {
      id: n.id,
      content: n.content || '',
      contentPreview: (n.content || '').length > 60 ? (n.content || '').slice(0, 60) + '...' : (n.content || ''),
      images,
      coverImage: images.length > 0 ? images[0] : '',
      imageCount: images.length,
      likes: n._count?.noteLikes || n.likes || 0,
      comments: n._count?.noteComments || n.comments || 0,
      courseName: n.course?.name || '',
      classGroupName: n.classGroup?.name || '',
      dateStr,
    };
  },

  onPullDownRefresh() {
    this.setData({ page: 1, notes: [], hasMore: true, refreshing: true });
    this.loadNotes().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 });
    this.loadNotes();
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    this._needRefresh = true;
    wx.navigateTo({ url: `/pages/note/detail/index?id=${id}` });
  },

  onDeleteNote(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除这条笔记吗？',
      confirmColor: '#e74c3c',
      success: async (res) => {
        if (res.confirm) {
          try {
            await del(`/notes/${id}`);
            wx.showToast({ title: '已删除', icon: 'success' });
            // 从列表中移除
            const notes = this.data.notes.filter((n) => n.id !== id);
            this.setData({ notes });
          } catch (e) {
            console.error('删除失败', e);
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      },
    });
  },

  goPublish() {
    this._needRefresh = true;
    wx.navigateTo({ url: '/pages/note/publish/index' });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/index' }) });
  },
});
