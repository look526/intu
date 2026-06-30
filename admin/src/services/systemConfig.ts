import request from '../utils/request';

export function getConfig(key: string) {
  return request.get(`/system-config/${key}`);
}

export function updateConfig(key: string, value: unknown) {
  return request.put(`/system-config/${key}`, { value });
}
