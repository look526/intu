const { get, post, del, resolveImageUrl } = require('../../../utils/request');

Page({
  data: {
    navPaddingTop: 20,
    classGroupId: '',
    detail: null,
    classmates: [],
    schedules: [],
    showAllSchedules: false,
    notes: [],
    notePage: 1,
    noteHasMore: true,
    noteLoading: false,
    loading: true,
  },

  onLoad(options) {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });
    if (options.id) {
      this.setData({ classGroupId: options.id });
      this.loadDetail();
      this.loadClassmates();
      this.loadSchedules();
      this.loadNotes(true);
    }
  },

  async loadDetail() {
    try {
      const detail = await get(`/class-groups/${this.data.classGroupId}/detail`);
      // 格式化下次开课时间
      if (detail.nextSchedule && detail.nextSchedule.startTime) {
        const d = new Date(detail.nextSchedule.startTime);
        const pad = (n) => String(n).padStart(2, '0');
        detail.nextSchedule.startTimeFormatted = `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      this.setData({ detail, loading: false });
      wx.setNavigationBarTitle({ title: detail.name || '班级详情' });
    } catch (err) {
      console.error('loadDetail error:', err);
      this.setData({ loading: false });
    }
  },

  async loadClassmates() {
    try {
      const list = await get(`/class-groups/${this.data.classGroupId}/classmates`);
      const classmates = (list || []).map((c) => ({
        ...c,
        avatar: resolveImageUrl(c.avatar || ''),
      }));
      this.setData({ classmates });
    } catch (err) {
      console.error('loadClassmates error:', err);
    }
  },

  async loadSchedules() {
    try {
      const list = await get(`/class-groups/${this.data.classGroupId}/schedules`);
      const now = Date.now();
      const schedules = (list || []).map((s) => {
        const start = new Date(s.startTime);
        const end = new Date(s.endTime);
        const pad = (n) => String(n).padStart(2, '0');
        const dateStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
        const timeStr = `${pad(start.getHours())}:${pad(start.getMinutes())}-${pad(end.getHours())}:${pad(end.getMinutes())}`;
        const venueName = s.classroom?.venue?.name || '';
        const classroomName = s.classroom?.name || '';
        const location = venueName ? `${classroomName} (${venueName})` : classroomName;
        const isPast = end.getTime() < now;
        return {
          id: s.id,
          date: dateStr,
          time: timeStr,
          courseName: s.course?.name || '',
          teacher: s.teacher?.realName || '',
          location,
          isPast,
        };
      });
      this.setData({ schedules, showAllSchedules: false });
      this._updateVisibleSchedules(schedules, false);
    } catch (err) {
      console.error('loadSchedules error:', err);
    }
  },

  toggleShowAllSchedules() {
    const show = !this.data.showAllSchedules;
    this.setData({ showAllSchedules: show });
    this._updateVisibleSchedules(this.data.schedules, show);
  },

  _updateVisibleSchedules(schedules, showAll) {
    if (showAll) {
      this.setData({ visibleSchedules: schedules });
    } else {
      const now = Date.now();
      const sevenDays = 7 * 24 * 3600 * 1000;
      const recent = schedules.filter((s) => {
        const d = new Date(s.date).getTime();
        return d >= now - 86400000 && d <= now + sevenDays;
      });
      // 如果7天内无课表，显示最近的几条
      this.setData({ visibleSchedules: recent.length > 0 ? recent : schedules.slice(0, 3) });
    }
  },

  async loadNotes(reset = false) {
    if (this.data.noteLoading) return;
    const page = reset ? 1 : this.data.notePage;
    if (!reset && !this.data.noteHasMore) return;
    this.setData({ noteLoading: true });
    try {
      const res = await get('/notes', {
        scope: 'classmates',
        classGroupId: this.data.classGroupId,
        page,
        pageSize: 10,
      });
      const newNotes = (res.items || []).map((n) => this.mapNote(n));
      this.setData({
        notes: reset ? newNotes : this.data.notes.concat(newNotes),
        notePage: page + 1,
        noteHasMore: newNotes.length >= 10,
      });
    } catch (err) {
      console.error('loadNotes error:', err);
    } finally {
      this.setData({ noteLoading: false });
    }
  },

  loadMoreNotes() {
    if (this.data.noteHasMore && !this.data.noteLoading) {
      this.loadNotes(false);
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
    };
  },

  async likeNote(e) {
    const id = e.currentTarget.dataset.id;
    const note = this.data.notes.find((n) => n.id === id);
    if (!note) return;
    try {
      if (note.isLiked) {
        const res = await del(`/notes/${id}/like`);
        this.updateNote(id, { isLiked: false, likes: res.likes });
      } else {
        const res = await post(`/notes/${id}/like`);
        this.updateNote(id, { isLiked: true, likes: res.likes });
      }
    } catch (err) {
      console.error('likeNote error:', err);
    }
  },

  updateNote(id, updates) {
    const notes = this.data.notes.map((n) =>
      n.id === id ? { ...n, ...updates } : n,
    );
    this.setData({ notes });
  },

  goNoteDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/note/detail/index?id=${id}` });
  },

  goPublishNote() {
    const { classGroupId, detail } = this.data;
    const courseId = detail?.course?.id || '';
    wx.navigateTo({
      url: `/pages/note/publish/index?classGroupId=${classGroupId}&courseId=${courseId}`,
    });
  },

  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({ current, urls });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/study/index' }) });
  },
});
