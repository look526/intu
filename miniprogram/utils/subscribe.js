/**
 * 微信订阅消息授权工具
 * 封装 wx.requestSubscribeMessage，静默处理失败
 */

// 模板ID配置（在微信公众平台申请后填入）
const TEMPLATE_IDS = {
  order_paid: '',           // 订单支付成功通知
  application_result: '',   // 申请审核结果通知
  class_assigned: '',       // 分班通知
  class_started: '',        // 开课通知
  checkin_success: '',      // 打卡成功通知
  class_reminder: '',       // 上课提醒通知
};

/**
 * 请求订阅消息授权
 * @param {string[]} tmplIds - 模板ID数组
 * @returns {Promise<Object>} 授权结果
 */
function requestSubscribe(tmplIds) {
  // 过滤掉空模板ID
  const validIds = tmplIds.filter((id) => id && id.trim());
  if (validIds.length === 0) return Promise.resolve({});

  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: validIds,
      success: (res) => resolve(res),
      fail: () => resolve({}),
    });
  });
}

/**
 * 按场景请求订阅授权
 * @param {string} scene - 场景名称
 * @returns {Promise<Object>}
 */
function subscribeByScene(scene) {
  const sceneMap = {
    order: [TEMPLATE_IDS.order_paid],
    application: [TEMPLATE_IDS.application_result],
    class: [TEMPLATE_IDS.class_assigned, TEMPLATE_IDS.class_started],
    checkin: [TEMPLATE_IDS.checkin_success],
    class_reminder: [TEMPLATE_IDS.class_reminder],
    study: [TEMPLATE_IDS.class_reminder, TEMPLATE_IDS.checkin_success],
  };
  const ids = sceneMap[scene] || [];
  return requestSubscribe(ids);
}

module.exports = {
  TEMPLATE_IDS,
  requestSubscribe,
  subscribeByScene,
};
