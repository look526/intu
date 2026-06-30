Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '首页' },
      { pagePath: '/pages/course/list/index', text: '选课' },
      { pagePath: '/pages/study/index', text: '学习' },
      { pagePath: '/pages/mine/index', text: '我的' },
    ],
  },
  methods: {
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      this.setData({ selected: index });
      wx.switchTab({ url: path });
    },
  },
});
