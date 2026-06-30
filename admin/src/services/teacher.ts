import request from '../utils/request';

export interface Teacher {
  id: string;
  userId: string;
  realName: string;
  bio: string | null;
  specialties: string | null;
  certificateUrls: string[] | null;
  trainingStatus: 'pending' | 'passed' | 'failed';
  trainingDate: string | null;
  rating: string;
  reviewCount: number;
  isRecommended: boolean;
  status: 'active' | 'frozen';
  avatarUrl?: string;
  user?: { phone: string; avatar?: string };
  _count?: { courses: number; schedules: number };
  courses?: {
    id: string;
    name: string;
    status: string;
    totalHours: number;
    category: { name: string };
  }[];
}

export interface TeacherListResult {
  items: Teacher[];
  total: number;
  page: number;
  pageSize: number;
}

export function getTeachers(params?: {
  page?: number;
  pageSize?: number;
  trainingStatus?: string;
  status?: string;
  keyword?: string;
}): Promise<TeacherListResult> {
  return request.get('/teachers', { params });
}

export function getTeacherSimpleList(): Promise<{ id: string; userId: string; realName: string }[]> {
  return request.get('/teachers').then((res: any) =>
    (res.items || []).map((t: any) => ({ id: t.id, userId: t.userId, realName: t.realName })),
  );
}

export function getTeacher(id: string): Promise<Teacher> {
  return request.get(`/teachers/${id}`);
}

export function createTeacher(data: Partial<Teacher>) {
  return request.post('/teachers', data);
}

export function updateTeacher(id: string, data: Partial<Teacher>) {
  return request.put(`/teachers/${id}`, data);
}

export function updateTrainingStatus(id: string, trainingStatus: string) {
  return request.put(`/teachers/${id}/training-status`, { trainingStatus });
}

export function updateTeacherStatus(id: string, status: string) {
  return request.put(`/teachers/${id}/status`, { status });
}

export function toggleTeacherRecommend(id: string) {
  return request.put(`/teachers/${id}/recommend`);
}
