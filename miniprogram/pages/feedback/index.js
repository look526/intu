const { post, uploadFile } = require('../../utils/request');
const { getToken } = require('../../utils/auth');

Page({
  data: {
    navPaddingTop: 20,
    type: '功能建议',
    types: ['功能建议', '问题反馈', '其他'],
    content: '',
    contact: '',
    images: [],
    submitting: false,
  },

  onLoad() {
    const sysInfo = wx.getWindowInfo();
    this.setData({ navPaddingTop: sysInfo.statusBarHeight || 20 });
  },

  goBack() {
    wx.navigateBack();
  },

  onTypeChange(e) {
    this.setData({ type: this.data.types[e.detail.value] });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value });
  },

  chooseImage() {
    const remaining = 4 - this.data.images.length;
    if (remaining <= 0) {
      return wx.showToast({ title: '最多上传4张图片', icon: 'none' });
    }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath);
        this.setData({ images: [...this.data.images, ...newImages] });
      },
    });
  },

  removeImage(e) {
    const idx = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(idx, 1);
    this.setData({ images });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ current: url, urls: this.data.images });
  },

  async submit() {
    const { type, content, contact, images } = this.data;
    if (!content.trim()) {
      return wx.showToast({ title: '请输入反馈内容', icon: 'none' });
    }
    if (content.trim().length < 5) {
      return wx.showToast({ title: '反馈内容至少5个字', icon: 'none' });
    }

    this.setData({ submitting: true });
    try {
      // 上传图片
      const uploadedUrls = [];
      for (const img of images) {
        const res = await uploadFile(img);
        uploadedUrls.push(res.url);
      }

      await post('/feedback', {
        type,
        content: content.trim(),
        images: uploadedUrls,
        contact: contact.trim() || undefined,
      });

      wx.showToast({ title: '提交成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (e) {
      console.error('提交反馈失败', e);
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
