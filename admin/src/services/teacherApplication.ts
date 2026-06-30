import request from '../utils/request';

export interface TeacherApplication {
  id: string;
  userId: string;
  realName: string;
  phone: string;
  specialties: string;
  teachingYears: number;
  bio: string | null;
  avatarUrl: string | null;
  certificateUrls: string[] | null;
  portfolioUrls: string[] | null;
  introVideoUrl: string | null;
  status: 'pending' | 'approved' | 'rejected';
  auditRemark: string | null;
  createdAt: string;
  user?: {
    nickname: string | null;
    phone: string;
    avatar: string | null;
  };
}

export interface TeacherApplicationListResult {
  items: TeacherApplication[];
  total: number;
  page: number;
  pageSize: number;
}

export function getTeacherApplications(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<TeacherApplicationListResult> {
  return request.get('/teacher-applications', { params });
}

export function getTeacherApplication(
  id: string,
): Promise<TeacherApplication> {
  return request.get(`/teacher-applications/${id}`);
}

export function auditTeacherApplication(
  id: string,
  data: { status: 'approved' | 'rejected'; auditRemark?: string },
): Promise<TeacherApplication> {
  return request.put(`/teacher-applications/${id}/audit`, data);
}
