const { get, post, del, resolveImageUrl } = require('../../utils/request');
const { getToken } = require('../../utils/auth');
const { subscribeByScene } = require('../../utils/subscribe');
const { checkPopup } = require('../../utils/popup');

Page({
  data: {
    statusBarHeight: 0,
    navPaddingTop: 20,
    activeTab: 'center', // center | myClass | schedule
    isLoggedIn: false,
    // 今日课程
    todayCourses: [],
    // 学习笔记
    noteScope: 'classmates', // classmates | all
    notes: [],
    notePage: 1,
    noteHasMore: true,
    noteLoading: false,
    // 我的班级
    myClassGroups: [],
    classGroupLoading: false,
    // 课表相关
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    weekDates: [],
    calendarYear: 2026,
    calendarMonth: 4,
    selectedDate: '',
    selectedMonth: 4,
    selectedDay: 1,
    calendarExpanded: false,
    monthDates: [], // 月视图日期数据（二维数组，每行7天）
    scheduleDates: [], // 有课的日期列表
    scheduleCourses: [],
    // 评价弹窗
    showReviewModal: false,
    reviewScheduleId: '',
    reviewRating: 0,
    reviewContent: '',
    reviewSubmitting: false,
    popupVisible: false,
    popupData: null,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    const token = getToken();
    this.setData({ isLoggedIn: !!token });
    if (token) {
      this.loadTodayCourses();
      this.loadNotes(true);
      // 静默请求订阅消息授权（上课提醒 + 打卡成功）
      subscribeByScene('study');
    } else {
      this.setData({ todayCourses: [], scheduleCourses: [], notes: [], myClassGroups: [] });
    }
    this._checkPopup();
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    const statusBarHeight = sysInfo.statusBarHeight || 20;
    this.setData({
      statusBarHeight: statusBarHeight,
      navPaddingTop: statusBarHeight + 12,
    });
    this.initCalendar();
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    if (tab === 'myClass' && this.data.myClassGroups.length === 0) {
      this.loadMyClassGroups();
    }
  },

  // ===== 学习中心：今日课程 =====
  async loadTodayCourses() {
    try {
      const schedules = await get('/schedules/my-today');
      const todayCourses = this.mapSchedules(schedules);
      this.setData({ todayCourses });
    } catch (err) {
      console.error('loadTodayCourses error:', err);
      this.setData({ todayCourses: [] });
    }
  },

  // ===== 课表：按日期加载 =====
  async loadSchedule(dateStr) {
    if (!getToken()) {
      this.setData({ scheduleCourses: [] });
      return;
    }
    try {
      const schedules = await get(`/schedules/my?date=${dateStr}`);
      const scheduleCourses = this.mapSchedules(schedules);
      this.setData({ scheduleCourses });
    } catch (err) {
      console.error('loadSchedule error:', err);
      this.setData({ scheduleCourses: [] });
    }
  },

  /**
   * 将后端 schedule 对象数组映射为前端展示格式
   */
  mapSchedules(schedules) {
    if (!Array.isArray(schedules)) return [];
    const themes = ['orange', 'blue'];
    const now = Date.now();
    return schedules.map((s, idx) => {
      const start = new Date(s.startTime);
      const end = new Date(s.endTime);
      const timeStr = `${this.padTime(start.getHours())}:${this.padTime(start.getMinutes())}-${this.padTime(end.getHours())}:${this.padTime(end.getMinutes())}`;
      const venueName = s.classroom?.venue?.name || '';
      const classroomName = s.classroom?.name || '';
      const location = venueName ? `${classroomName} (${venueName})` : classroomName;
      // 上课开始1小时后超时，禁止打卡
      const expired = now > start.getTime() + 3600000;
      return {
        id: s.id,
        time: timeStr,
        title: s.course?.name || '',
        location,
        teacher: s.teacher?.realName || '',
        theme: themes[idx % themes.length],
        checkedIn: !!s.checkedIn,
        hasReviewed: !!s.hasReviewed,
        expired,
      };
    });
  },

  padTime(n) {
    return String(n).padStart(2, '0');
  },

  // ===== 学习中心相关 =====
  goCheckin(e) {
    const scheduleId = e.currentTarget.dataset.id;
    const course = this.data.todayCourses.find((c) => c.id === scheduleId);
    if (course && course.checkedIn) return;
    wx.navigateTo({ url: `/pages/checkin/index?scheduleId=${scheduleId}` });
  },

  // ===== 评价相关 =====
  goReview(e) {
    const scheduleId = e.currentTarget.dataset.id;
    this.setData({
      showReviewModal: true,
      reviewScheduleId: scheduleId,
      reviewRating: 0,
      reviewContent: '',
    });
  },

  setReviewRating(e) {
    const rating = e.currentTarget.dataset.rating;
    this.setData({ reviewRating: rating });
  },

  setReviewContent(e) {
    this.setData({ reviewContent: e.detail.value });
  },

  closeReviewModal() {
    this.setData({ showReviewModal: false });
  },

  async submitReview() {
    if (this.data.reviewRating === 0) {
      wx.showToast({ title: '请选择评分', icon: 'none' });
      return;
    }
    if (this.data.reviewSubmitting) return;
    this.setData({ reviewSubmitting: true });
    try {
      await post('/reviews', {
        scheduleId: this.data.reviewScheduleId,
        rating: this.data.reviewRating,
        content: this.data.reviewContent || undefined,
      });
      // 更新卡片状态
      const todayCourses = this.data.todayCourses.map((c) =>
        c.id === this.data.reviewScheduleId ? { ...c, hasReviewed: true } : c,
      );
      this.setData({ todayCourses, showReviewModal: false });
      wx.showToast({ title: '评价成功', icon: 'success' });
    } catch (err) {
      console.error('submitReview error:', err);
      wx.showToast({ title: err.message || '评价失败', icon: 'none' });
    } finally {
      this.setData({ reviewSubmitting: false });
    }
  },

  goPublishNote() {
    wx.navigateTo({ url: '/pages/note/publish/index' });
  },

  goNoteDetail(e) {
    const id = e.currentTarget.dataset.id;
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

  updateNoteInList(id, updates) {
    const notes = this.data.notes.map((n) =>
      n.id === id ? { ...n, ...updates } : n,
    );
    this.setData({ notes });
  },

  async favoriteNote(e) {
    const id = e.currentTarget.dataset.id;
    const note = this.data.notes.find((n) => n.id === id);
    if (!note) return;
    try {
      if (note.isFavorited) {
        await del(`/notes/${id}/favorite`);
        this.updateNoteInList(id, { isFavorited: false });
      } else {
        await post(`/notes/${id}/favorite`);
        this.updateNoteInList(id, { isFavorited: true });
      }
    } catch (err) {
      console.error('favoriteNote error:', err);
    }
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
      title: '趣学坊 - 学习中心',
      path: '/pages/study/index',
    };
  },

  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({ current, urls });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },

  // ===== 笔记加载 =====
  async loadNotes(reset = false) {
    if (this.data.noteLoading) return;
    const page = reset ? 1 : this.data.notePage;
    if (!reset && !this.data.noteHasMore) return;
    this.setData({ noteLoading: true });
    try {
      const res = await get('/notes', {
        scope: this.data.noteScope,
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

  switchNoteScope(e) {
    const scope = e.currentTarget.dataset.scope;
    if (scope === this.data.noteScope) return;
    this.setData({ noteScope: scope, notes: [], notePage: 1, noteHasMore: true });
    this.loadNotes(true);
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
      isFavorited: !!n.isFavorited,
    };
  },

  // ===== 我的班级 =====
  async loadMyClassGroups() {
    this.setData({ classGroupLoading: true });
    try {
      const data = await get('/class-groups/my');
      this.setData({ myClassGroups: data || [] });
    } catch (err) {
      console.error('loadMyClassGroups error:', err);
      this.setData({ myClassGroups: [] });
    } finally {
      this.setData({ classGroupLoading: false });
    }
  },

  goClassGroupDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/classgroup/detail/index?id=${id}` });
  },

  // ===== 课表相关 =====
  initCalendar() {
    const now = new Date();
    const today = this.formatDate(now);
    this.setData({
      calendarYear: now.getFullYear(),
      calendarMonth: now.getMonth() + 1,
      selectedDate: today,
      selectedMonth: now.getMonth() + 1,
      selectedDay: now.getDate(),
    });
    this.loadScheduleDates(now.getFullYear(), now.getMonth() + 1).then(() => {
      this.buildWeekDates(now);
    });
  },

  /** 加载某月有课日期列表 */
  async loadScheduleDates(year, month) {
    if (!getToken()) {
      this.setData({ scheduleDates: [] });
      return;
    }
    try {
      const dates = await get(`/schedules/my-dates?year=${year}&month=${month}`);
      this.setData({ scheduleDates: dates || [] });
    } catch (err) {
      console.error('loadScheduleDates error:', err);
      this.setData({ scheduleDates: [] });
    }
  },

  buildWeekDates(baseDate) {
    const d = new Date(baseDate);
    const dayOfWeek = d.getDay();
    const startDate = new Date(d);
    startDate.setDate(d.getDate() - dayOfWeek);

    const today = this.formatDate(new Date());
    const selected = this.data.selectedDate;
    const scheduleDates = this.data.scheduleDates;
    const dates = [];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(startDate);
      cur.setDate(startDate.getDate() + i);
      const dateStr = this.formatDate(cur);
      dates.push({
        date: dateStr,
        day: cur.getDate(),
        isToday: dateStr === today,
        isSelected: dateStr === selected,
        hasCourse: scheduleDates.indexOf(dateStr) !== -1,
      });
    }

    this.setData({ weekDates: dates });
    this.loadSchedule(selected);
  },

  selectDate(e) {
    const dateStr = e.currentTarget.dataset.date;
    const d = new Date(dateStr);
    const newYear = d.getFullYear();
    const newMonth = d.getMonth() + 1;
    const monthChanged = newYear !== this.data.calendarYear || newMonth !== this.data.calendarMonth;
    this.setData({
      selectedDate: dateStr,
      selectedMonth: newMonth,
      selectedDay: d.getDate(),
      calendarYear: newYear,
      calendarMonth: newMonth,
    });
    const rebuild = () => {
      if (this.data.calendarExpanded) {
        this.buildMonthDates();
      } else {
        this.buildWeekDates(d);
      }
    };
    if (monthChanged) {
      this.loadScheduleDates(newYear, newMonth).then(rebuild);
    } else {
      rebuild();
    }
    this.loadSchedule(dateStr);
  },

  backToToday() {
    const now = new Date();
    const today = this.formatDate(now);
    const newYear = now.getFullYear();
    const newMonth = now.getMonth() + 1;
    const monthChanged = newYear !== this.data.calendarYear || newMonth !== this.data.calendarMonth;
    this.setData({
      selectedDate: today,
      calendarYear: newYear,
      calendarMonth: newMonth,
      selectedMonth: newMonth,
      selectedDay: now.getDate(),
    });
    const rebuild = () => {
      if (this.data.calendarExpanded) {
        this.buildMonthDates();
      } else {
        this.buildWeekDates(now);
      }
    };
    if (monthChanged) {
      this.loadScheduleDates(newYear, newMonth).then(rebuild);
    } else {
      rebuild();
    }
    this.loadSchedule(today);
  },

  toggleCalendar() {
    const expanded = !this.data.calendarExpanded;
    this.setData({ calendarExpanded: expanded });
    if (expanded) {
      this.loadScheduleDates(this.data.calendarYear, this.data.calendarMonth).then(() => {
        this.buildMonthDates();
      });
    } else {
      this.buildWeekDates(new Date(this.data.selectedDate));
    }
  },

  /** 生成月视图日期数据（含前后月填充） */
  buildMonthDates() {
    const year = this.data.calendarYear;
    const month = this.data.calendarMonth;
    const today = this.formatDate(new Date());
    const selected = this.data.selectedDate;
    const scheduleDates = this.data.scheduleDates;

    // 本月第一天和最后一天
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startWeekday = firstDay.getDay();

    const allDates = [];

    // 前月填充
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, -i);
      const dateStr = this.formatDate(d);
      allDates.push({
        date: dateStr,
        day: d.getDate(),
        isToday: false,
        isSelected: false,
        isCurrentMonth: false,
        hasCourse: scheduleDates.indexOf(dateStr) !== -1,
      });
    }

    // 本月日期
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month - 1, i);
      const dateStr = this.formatDate(d);
      allDates.push({
        date: dateStr,
        day: i,
        isToday: dateStr === today,
        isSelected: dateStr === selected,
        isCurrentMonth: true,
        hasCourse: scheduleDates.indexOf(dateStr) !== -1,
      });
    }

    // 后月填充
    const remainder = allDates.length % 7;
    if (remainder > 0) {
      const fill = 7 - remainder;
      for (let i = 1; i <= fill; i++) {
        const d = new Date(year, month, i);
        const dateStr = this.formatDate(d);
        allDates.push({
          date: dateStr,
          day: d.getDate(),
          isToday: false,
          isSelected: false,
          isCurrentMonth: false,
          hasCourse: scheduleDates.indexOf(dateStr) !== -1,
        });
      }
    }

    const rows = [];
    for (let i = 0; i < allDates.length; i += 7) {
      rows.push(allDates.slice(i, i + 7));
    }

    this.setData({ monthDates: rows });
  },

  goSelectCourse() {
    wx.switchTab({ url: '/pages/course/list/index' });
  },

  formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  async _checkPopup() {
    const popup = await checkPopup('/pages/study/index');
    if (popup) {
      this.setData({ popupVisible: true, popupData: popup });
    }
  },

  onPopupClose() {
    this.setData({ popupVisible: false });
  },
});
