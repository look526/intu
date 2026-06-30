const TOKEN_KEY = 'intu_token';

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

function setToken(token) {
  wx.setStorageSync(TOKEN_KEY, token);
}

function removeToken() {
  wx.removeStorageSync(TOKEN_KEY);
}

module.exports = {
  getToken,
  setToken,
  removeToken,
};
