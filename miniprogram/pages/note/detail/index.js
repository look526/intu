const { get, post, del, resolveImageUrl } = require('../../../utils/request');

Page({
  data: {
    navPaddingTop: 20,
    note: null,
    recommendList: [],
    commentText: '',
    submitting: false,
  },

  onLoad(options) {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      navPaddingTop: (sysInfo.statusBarHeight || 20) + 12,
    });
    if (options.id) {
      this.noteId = options.id;
      this.loadNote(options.id);
      this.loadRecommend(options.id);
    }
  },

  /** 加载笔记详情 */
  async loadNote(id) {
    try {
      const n = await get(`/notes/${id}`);
      this.setData({ note: this.mapNote(n) });
    } catch (err) {
      console.error('loadNote error:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  /** 加载推荐笔记 */
  async loadRecommend(currentNoteId) {
    try {
      const res = await get('/notes/recommend', { currentNoteId, pageSize: 6 });
      const list = (res.items || []).map((n) => this.mapNote(n));
      this.setData({ recommendList: list });
    } catch (err) {
      console.error('loadRecommend error:', err);
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

    const images = (n.images || []).map(resolveImageUrl);

    const comments = (n.noteComments || []).map((c) => {
      const t = new Date(c.createdAt);
      const d = Date.now() - t.getTime();
      let cTimeAgo;
      if (d < 3600000) cTimeAgo = Math.max(1, Math.floor(d / 60000)) + '分钟前';
      else if (d < 86400000) cTimeAgo = Math.floor(d / 3600000) + '小时前';
      else cTimeAgo = Math.floor(d / 86400000) + '天前';
      return {
        id: c.id,
        username: c.student?.user?.nickname || '匿名',
        avatar: resolveImageUrl(c.student?.user?.avatar || ''),
        content: c.content,
        timeAgo: cTimeAgo,
      };
    });

    return {
      id: n.id,
      username: n.student?.user?.nickname || '匿名',
      avatar: resolveImageUrl(n.student?.user?.avatar || ''),
      timeAgo,
      courseName: n.course?.name || '',
      content: n.content,
      images,
      coverImage: images.length > 0 ? images[0] : '',
      likes: n.likes || 0,
      comments: n.comments || 0,
      isLiked: !!n.isLiked,
      isFavorited: !!n.isFavorited,
      formattedComments: comments,
    };
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/study/index' }) });
  },

  /** 点赞 */
  async toggleLike() {
    const { note } = this.data;
    if (!note) return;
    try {
      if (note.isLiked) {
        const res = await del(`/notes/${note.id}/like`);
        this.setData({ 'note.isLiked': false, 'note.likes': res.likes });
      } else {
        const res = await post(`/notes/${note.id}/like`);
        this.setData({ 'note.isLiked': true, 'note.likes': res.likes });
      }
    } catch (err) {
      console.error('toggleLike error:', err);
    }
  },

  /** 收藏 */
  async toggleFavorite() {
    const { note } = this.data;
    if (!note) return;
    try {
      if (note.isFavorited) {
        await del(`/notes/${note.id}/favorite`);
        this.setData({ 'note.isFavorited': false });
      } else {
        await post(`/notes/${note.id}/favorite`);
        this.setData({ 'note.isFavorited': true });
      }
    } catch (err) {
      console.error('toggleFavorite error:', err);
    }
  },

  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  /** 提交评论 */
  async submitComment() {
    const { commentText, note } = this.data;
    if (!commentText.trim() || !note) return;
    this.setData({ submitting: true });
    try {
      await post(`/notes/${note.id}/comments`, { content: commentText.trim() });
      wx.showToast({ title: '评论成功', icon: 'success' });
      this.setData({ commentText: '' });
      this.loadNote(note.id);
    } catch (err) {
      console.error('submitComment error:', err);
    } finally {
      this.setData({ submitting: false });
    }
  },

  /** 预览图片 */
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({ current, urls });
  },

  /** 点击推荐笔记 */
  goRecommendNote(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      this.noteId = id;
      this.loadNote(id);
      this.loadRecommend(id);
      // 回到顶部
      this.setData({ scrollTop: 0 });
    }
  },

  /** 微信原生分享 */
  onShareAppMessage() {
    const { note } = this.data;
    if (!note) return {};
    return {
      title: (note.content || '').substring(0, 30) + ((note.content || '').length > 30 ? '...' : ''),
      path: `/pages/note/detail/index?id=${note.id}`,
      imageUrl: note.coverImage || '',
    };
  },

  onShareTimeline() {
    const { note } = this.data;
    if (!note) return {};
    return {
      title: (note.content || '').substring(0, 30),
      query: `id=${note.id}`,
      imageUrl: note.coverImage || '',
    };
  },
});
