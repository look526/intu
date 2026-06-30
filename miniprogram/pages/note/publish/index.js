const { get, post } = require('../../../utils/request');

Page({
  data: {
    navPaddingTop: 20,
    content: '',
    images: [],
    visibility: 'all', // 'all' | 'class' | 'course'
    classGroupId: '',
    courseId: '',
    selectedClassName: '',
    selectedCourseName: '',
    myClassGroups: [],
    myCourses: [],
    submitting: false,
  },

  onLoad(options) {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });

    const classGroupId = options.classGroupId || '';
    const courseId = options.courseId || '';

    // 根据参数自动设置可见范围
    let visibility = 'all';
    if (classGroupId) {
      visibility = 'class';
    } else if (courseId) {
      visibility = 'course';
    }

    this.setData({ classGroupId, courseId, visibility });
    this.loadMyClassGroups().then(() => this._syncSelectedNames());
  },

  async loadMyClassGroups() {
    try {
      const data = await get('/class-groups/my');
      const groups = data || [];
      // 提取去重课程列表
      const courseMap = new Map();
      for (const g of groups) {
        if (g.course && g.course.id && !courseMap.has(g.course.id)) {
          courseMap.set(g.course.id, { id: g.course.id, name: g.course.name });
        }
      }
      this.setData({
        myClassGroups: groups,
        myCourses: Array.from(courseMap.values()),
      });
      this._syncSelectedNames();
    } catch (err) {
      console.error('loadMyClassGroups error:', err);
    }
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/study/index' }) });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  onVisibilityChange(e) {
    const value = e.currentTarget.dataset.value;
    const update = { visibility: value };
    if (value === 'all') {
      update.classGroupId = '';
      update.courseId = '';
    } else if (value === 'class') {
      update.courseId = '';
    } else if (value === 'course') {
      update.classGroupId = '';
    }
    this.setData(update);
  },

  onClassGroupChange(e) {
    const idx = e.detail.value;
    const group = this.data.myClassGroups[idx];
    if (group) {
      this.setData({
        classGroupId: group.id,
        courseId: group.course?.id || '',
        selectedClassName: group.name,
      });
    }
  },

  onCourseChange(e) {
    const idx = e.detail.value;
    const course = this.data.myCourses[idx];
    if (course) {
      this.setData({ courseId: course.id, selectedCourseName: course.name });
    }
  },

  _syncSelectedNames() {
    const { classGroupId, courseId, myClassGroups, myCourses } = this.data;
    const cg = myClassGroups.find((g) => g.id === classGroupId);
    const co = myCourses.find((c) => c.id === courseId);
    this.setData({
      selectedClassName: cg ? cg.name : '',
      selectedCourseName: co ? co.name : '',
    });
  },

  chooseImages() {
    const remain = 9 - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多9张图片', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map((f) => f.tempFilePath);
        this.setData({ images: this.data.images.concat(newImages) });
      },
    });
  },

  removeImage(e) {
    const idx = e.currentTarget.dataset.idx;
    const images = this.data.images.filter((_, i) => i !== idx);
    this.setData({ images });
  },

  previewImage(e) {
    const { idx } = e.currentTarget.dataset;
    wx.previewImage({
      current: this.data.images[idx],
      urls: this.data.images,
    });
  },

  async submitNote() {
    const { content, images, visibility, courseId, classGroupId } = this.data;
    if (!content.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }

    // 校验可见范围选择
    if (visibility === 'class' && !classGroupId) {
      wx.showToast({ title: '请选择班级', icon: 'none' });
      return;
    }
    if (visibility === 'course' && !courseId) {
      wx.showToast({ title: '请选择课程', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      let uploadedImages = [];
      if (images.length > 0) {
        uploadedImages = await this.uploadImages(images);
      }

      const payload = {
        content: content.trim(),
        images: uploadedImages,
      };

      if (visibility === 'class') {
        payload.classGroupId = classGroupId;
        payload.courseId = courseId || undefined;
      } else if (visibility === 'course') {
        payload.courseId = courseId;
      }

      await post('/notes', payload);

      wx.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    } catch (err) {
      console.error('submitNote error:', err);
    } finally {
      this.setData({ submitting: false });
    }
  },

  async uploadImages(tempFiles) {
    const app = getApp();
    const baseUrl = app.globalData.baseUrl;
    const { getToken } = require('../../../utils/auth');
    const token = getToken();

    const urls = [];
    for (const filePath of tempFiles) {
      try {
        const res = await new Promise((resolve, reject) => {
          wx.uploadFile({
            url: `${baseUrl}/upload`,
            filePath,
            name: 'file',
            header: { Authorization: token ? `Bearer ${token}` : '' },
            success: (r) => {
              if (r.statusCode >= 200 && r.statusCode < 300) {
                const data = JSON.parse(r.data);
                const imgUrl = data.url || data.path || '';
                // 始终存相对路径，展示时再拼 baseUrl
                resolve(imgUrl);
              } else {
                reject(new Error('上传失败'));
              }
            },
            fail: reject,
          });
        });
        if (res) urls.push(res);
      } catch (err) {
        console.error('upload image error:', err);
      }
    }
    return urls;
  },
});
