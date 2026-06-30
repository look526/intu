const { getToken, removeToken } = require('./auth');

/**
 * 封装 wx.request，返回 Promise
 * @param {Object} options - 请求配置
 * @param {string} options.url - 请求路径（不含 baseUrl）
 * @param {string} [options.method='GET'] - 请求方法
 * @param {Object} [options.data] - 请求数据
 * @param {Object} [options.header] - 自定义请求头
 * @returns {Promise}
 */
function request(options) {
  const app = getApp();
  const baseUrl = app.globalData.baseUrl;
  const token = getToken();

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        ...options.header,
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          removeToken();
          wx.showToast({ title: '登录已过期', icon: 'none' });
          wx.redirectTo({ url: '/pages/login/index' });
          reject(res);
        } else {
          wx.showToast({
            title: res.data.message || '请求失败',
            icon: 'none',
          });
          reject(res);
        }
      },
      fail(err) {
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      },
    });
  });
}

// 便捷方法
function get(url, data) {
  return request({ url, method: 'GET', data });
}

function post(url, data) {
  return request({ url, method: 'POST', data });
}

function put(url, data) {
  return request({ url, method: 'PUT', data });
}

function del(url, data) {
  return request({ url, method: 'DELETE', data });
}

function patch(url, data) {
  return request({ url, method: 'PATCH', data });
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
  patch,
  /**
   * 上传文件（图片）
   * @param {string} filePath - 临时文件路径
   * @returns {Promise<{url: string}>}
   */
  uploadFile(filePath) {
    const app = getApp();
    const baseUrl = app.globalData.baseUrl;
    const token = getToken();
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${baseUrl}/upload`,
        filePath,
        name: 'file',
        header: { Authorization: token ? `Bearer ${token}` : '' },
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            resolve(data);
          } else {
            reject(res);
          }
        },
        fail: reject,
      });
    });
  },
  /**
   * 将相对路径转为完整 URL（已是 http(s) 开头则原样返回）
   */
  resolveImageUrl(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const app = getApp();
    return `${app.globalData.baseUrl}${path}`;
  },
};
