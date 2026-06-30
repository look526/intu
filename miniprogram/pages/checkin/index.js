const { get, post } = require('../../utils/request');

Page({
  data: {
    navPaddingTop: 20,
    scheduleId: '',
    courseName: '',
    classroomName: '',
    venueName: '',
    venueAddress: '',
    teacherName: '',
    timeStr: '',
    venueLatitude: 0,
    venueLongitude: 0,
    userLatitude: 0,
    userLongitude: 0,
    distance: -1,
    canCheckin: false,
    checkinDone: false,
    expired: false,
    locationFailed: false,
    loading: true,
    submitting: false,
    markers: [],
    circles: [],
  },

  onLoad(options) {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ navPaddingTop: (sysInfo.statusBarHeight || 20) + 12 });

    if (options.scheduleId) {
      this.setData({ scheduleId: options.scheduleId });
      this.loadScheduleLocation(options.scheduleId);
    }
  },

  async loadScheduleLocation(scheduleId) {
    try {
      const info = await get(`/checkin/schedule-location/${scheduleId}`);
      const start = new Date(info.startTime);
      const end = new Date(info.endTime);
      const pad = (n) => String(n).padStart(2, '0');
      const timeStr = `${pad(start.getHours())}:${pad(start.getMinutes())}-${pad(end.getHours())}:${pad(end.getMinutes())}`;

      this.setData({
        courseName: info.courseName,
        classroomName: info.classroomName,
        venueName: info.venueName,
        venueAddress: info.venueAddress || '',
        teacherName: info.teacherName || '',
        timeStr,
        venueLatitude: info.latitude,
        venueLongitude: info.longitude,
        expired: !!info.expired,
        loading: false,
      });

      this._updateMapElements(info.latitude, info.longitude);
      this.getUserLocation();
    } catch (err) {
      console.error('loadScheduleLocation error:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  getUserLocation() {
    this.setData({ locationFailed: false });
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        console.log('用户位置:', res.longitude + ',' + res.latitude);
        console.log('场地位置:', this.data.venueLongitude + ',' + this.data.venueLatitude);
        const dist = this._haversineDistance(
          res.latitude, res.longitude,
          this.data.venueLatitude, this.data.venueLongitude,
        );
        this.setData({
          userLatitude: res.latitude,
          userLongitude: res.longitude,
          distance: Math.round(dist),
          canCheckin: dist <= 500 && !this.data.expired,
          locationFailed: false,
        });
        this._updateMapElements(this.data.venueLatitude, this.data.venueLongitude);
      },
      fail: () => {
        this.setData({ locationFailed: true, canCheckin: false });
        wx.showModal({
          title: '需要定位权限',
          content: '打卡需要获取您的位置信息，请在设置中开启定位权限',
          confirmText: '去设置',
          success: (modalRes) => {
            if (modalRes.confirm) wx.openSetting();
          },
        });
      },
    });
  },

  refreshLocation() {
    wx.showLoading({ title: '刷新定位中...' });
    this.getUserLocation();
   
    setTimeout(() => wx.hideLoading(), 1000);
  },

  async doCheckin() {
    if (!this.data.canCheckin || this.data.submitting || this.data.checkinDone || this.data.expired) return;
    this.setData({ submitting: true });
    try {
      const result = await post('/checkin', {
        scheduleId: this.data.scheduleId,
        latitude: this.data.userLatitude,
        longitude: this.data.userLongitude,
      });
      this.setData({ checkinDone: true, submitting: false });
      if (result.locationValid) {
        wx.showToast({ title: '打卡成功 +1学分', icon: 'success' });
      } else {
        wx.showToast({ title: `已记录，距离${result.distance}m`, icon: 'none' });
      }
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      this.setData({ submitting: false });
      const msg = err?.message || err?.data?.message || '打卡失败';
      wx.showToast({ title: msg, icon: 'none' });
    }
  },

  _updateMapElements(venueLat, venueLng) {
    const markers = [{
      id: 1,
      latitude: venueLat,
      longitude: venueLng,
      width: 36,
      height: 36,
      callout: {
        content: this.data.classroomName || '教室',
        display: 'ALWAYS',
        fontSize: 13,
        borderRadius: 8,
        padding: 6,
        bgColor: '#2563EB',
        color: '#fff',
      },
    }];

    if (this.data.userLatitude && this.data.userLongitude) {
      markers.push({
        id: 2,
        latitude: this.data.userLatitude,
        longitude: this.data.userLongitude,
        width: 32,
        height: 32,
        callout: {
          content: '我的位置',
          display: 'ALWAYS',
          fontSize: 12,
          borderRadius: 8,
          padding: 6,
          bgColor: '#07c160',
          color: '#fff',
        },
      });
    }

    const circles = [{
      latitude: venueLat,
      longitude: venueLng,
      radius: 500,
      color: '#2563EB30',
      fillColor: '#2563EB15',
      strokeWidth: 2,
    }];

    this.setData({ markers, circles });
  },

  _haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/study/index' }) });
  },
});
