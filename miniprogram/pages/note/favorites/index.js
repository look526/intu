const { get, post, del, resolveImageUrl } = require('../../../utils/request');
const { getToken } = require('../../../utils/auth');

Page({
  data: {
    navPaddingTop: 20,
    notes: [],
    loading: true,
    page: 1,
    pageSize: 10,
    hasMore: true,
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
      const res = await get('/notes/my-favorites', {
        page: this.data.page,
        pageSize: this.data.pageSize,
      });
      const items = (res.items || []).map((n) => this.mapNote(n));
      const newNotes = this.data.page === 1 ? items : [...this.data.notes, ...items];
      this.setData({
        notes: newNotes,
        hasMore: items.length >= this.data.pageSize,
        loading: false,
      });
    } catch (e) {
      console.error('加载收藏失败', e);
      this.setData({ loading: false });
    }
  },

  mapNote(n) {
    const now = Date.now();
    const created = new Date(n.createdAt).getTime();
    const diff = now - created;
    let timeAgo;
    if (diff < 3600000) timeAgo = Math.max(1, Math.floor(diff / 60000)) + '分钟前';
    else if (diff < 86400000) timeAgo = Math.floor(diff / 3600000) + '小时前';
    else timeAgo = Math.floor(diff / 86400000) + '天前';
    return {
      id: n.id,
      username: n.student?.user?.nickname || '匿名',
      avatar: resolveImageUrl(n.student?.user?.avatar || ''),
      timeAgo,
      courseName: n.course?.name || '',
      content: n.content,
      images: (n.images || []).map(resolveImageUrl),
      likes: n.likes || 0,
      comments: n.comments || 0,
      isLiked: !!n.isLiked,
      isFavorited: true,
    };
  },

  onPullDownRefresh() {
    this.setData({ page: 1, notes: [], hasMore: true });
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

  async likeNote(e) {
    const id = e.currentTarget.dataset.id;
    const note = this.data.notes.find((n) => n.id === id);
    if (!note) return;
    try {
      if (note.isLiked) {
        const res = await del(`/notes/${id}/like`);
        this.updateNoteInList(id, { isLiked: false, likes: res.likes });
      } else {
        const res = await post(`/notes/${id}/like`);
        this.updateNoteInList(id, { isLiked: true, likes: res.likes });
      }
    } catch (err) {
      console.error('likeNote error:', err);
    }
  },

  async unfavoriteNote(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await del(`/notes/${id}/favorite`);
      // 从列表中移除
      const notes = this.data.notes.filter((n) => n.id !== id);
      this.setData({ notes });
      wx.showToast({ title: '已取消收藏', icon: 'none' });
    } catch (err) {
      console.error('unfavoriteNote error:', err);
    }
  },

  updateNoteInList(id, updates) {
    const notes = this.data.notes.map((n) =>
      n.id === id ? { ...n, ...updates } : n,
    );
    this.setData({ notes });
  },

  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({ current, urls });
  },

  onShareAppMessage(e) {
    const id = e.target?.dataset?.id;
    if (id) {
      const note = this.data.notes.find((n) => n.id === id);
      return {
        title: note ? note.content.slice(0, 30) : '来看看这篇学习笔记',
        path: `/pages/note/detail/index?id=${id}`,
      };
    }
    return {
      title: '趣学坊 - 我的收藏',
      path: '/pages/note/favorites/index',
    };
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/index' }) });
  },
});
