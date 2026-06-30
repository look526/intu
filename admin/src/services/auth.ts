import request from '../utils/request';

export interface LoginParams {
  phone: string;
  password: string;
}

export interface LoginResult {
  access_token: string;
}

export interface ProfileResult {
  id: string;
  phone: string;
  nickname: string | null;
  avatar: string | null;
  role: string;
  status: string;
  createdAt: string;
  admin: {
    realName: string;
    permission: unknown[];
  } | null;
}

export function loginApi(params: LoginParams): Promise<LoginResult> {
  return request.post('/auth/admin/login', params);
}

export function getProfileApi(): Promise<ProfileResult> {
  return request.get('/auth/profile');
}
