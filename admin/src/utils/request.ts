import axios from 'axios';
import { message } from 'antd';
import { getToken, removeToken } from './auth';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
});

// 请求拦截器：自动附加 JWT token
request.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 响应拦截器：统一错误处理
request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      removeToken();
      message.error('登录已过期，请重新登录');
      window.location.href = '/login';
    } else if (status === 403) {
      message.error('没有权限访问');
    } else if (status === 500) {
      message.error('服务器错误');
    } else {
      message.error(error.response?.data?.message || '请求失败');
    }
    return Promise.reject(error);
  },
);

export default request;
