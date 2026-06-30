const { get, resolveImageUrl } = require('./request');

// 缓存：避免每次 onShow 都请求接口
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

/**
 * 获取弹窗配置列表（带缓存）
 */
async function _fetchPopups() {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL) return _cache;
  try {
    const res = await get('/system-config/popups');
    _cache = Array.isArray(res) ? res : [];
    _cacheTime = now;
  } catch (e) {
    console.error('[popup] fetch error', e);
    _cache = _cache || [];
  }
  return _cache;
}

/**
 * 清除缓存（用于需要强制刷新时）
 */
function clearCache() {
  _cache = null;
  _cacheTime = 0;
}

/**
 * 获取当前时间的周标识 YYYY-Www
 */
function _getWeekKey() {
  const d = new Date();
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * 获取频率对应的 storage key
 */
function _getStorageKey(popup) {
  const id = popup.id;
  const freq = popup.frequency;
  if (!freq) return `popup_shown_${id}`;
  const now = new Date();
  switch (freq.type) {
    case 'once':
      return `popup_shown_${id}`;
    case 'daily': {
      const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      return `popup_shown_${id}_${day}`;
    }
    case 'weekly':
      return `popup_shown_${id}_${_getWeekKey()}`;
    case 'monthly': {
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return `popup_shown_${id}_${month}`;
    }
    default:
      return `popup_shown_${id}`;
  }
}

/**
 * 检查弹窗是否可展示（频率限制）
 */
function _canShow(popup) {
  const key = _getStorageKey(popup);
  const freq = popup.frequency;
  try {
    const val = wx.getStorageSync(key);
    if (freq && freq.type === 'once') {
      return !val; // 存在即不展示
    }
    const count = parseInt(val) || 0;
    const limit = (freq && freq.limit) || 1;
    return count < limit;
  } catch {
    return true;
  }
}

/**
 * 检查弹窗是否在有效期内
 */
function _isInDateRange(popup) {
  if (!popup.startTime && !popup.endTime) return true;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (popup.startTime && today < popup.startTime) return false;
  if (popup.endTime && today > popup.endTime) return false;
  return true;
}

/**
 * 检查当前页面是否有可展示的弹窗
 * @param {string} pagePath - 当前页面路径，如 /pages/index/index
 * @returns {object|null} 可展示的弹窗配置，或 null
 */
async function checkPopup(pagePath) {
  const popups = await _fetchPopups();
  for (const popup of popups) {
    if (popup.status !== 'published') continue;
    if (!Array.isArray(popup.targetPages) || !popup.targetPages.includes(pagePath)) continue;
    if (!_isInDateRange(popup)) continue;
    if (!_canShow(popup)) continue;
    // 返回第一个可展示的弹窗，处理图片 URL
    return {
      ...popup,
      imageUrl: resolveImageUrl(popup.imageUrl),
    };
  }
  return null;
}

/**
 * 记录弹窗已展示
 */
function recordShown(popup) {
  const key = _getStorageKey(popup);
  const freq = popup.frequency;
  try {
    if (freq && freq.type === 'once') {
      wx.setStorageSync(key, '1');
    } else {
      const count = parseInt(wx.getStorageSync(key)) || 0;
      wx.setStorageSync(key, String(count + 1));
    }
  } catch (e) {
    console.error('[popup] recordShown error', e);
  }
}

module.exports = { checkPopup, recordShown, clearCache };
