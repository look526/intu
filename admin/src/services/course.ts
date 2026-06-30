import request from '../utils/request';

export interface Course {
  id: string;
  name: string;
  categoryId: number;
  coverImage: string | null;
  description: string | null;
  totalHours: number;
  teacherId: string;
  isRecommended: boolean;
  status: 'draft' | 'published' | 'offline';
  createdAt: string;
  category: { id: number; name: string; icon: string | null };
  teacher: { id: string; realName: string };
}

export interface CourseListResult {
  items: Course[];
  total: number;
  page: number;
  pageSize: number;
}

export function getCourses(params?: {
  page?: number;
  pageSize?: number;
  categoryId?: number;
  status?: string;
  keyword?: string;
}): Promise<CourseListResult> {
  return request.get('/courses', { params });
}

export function getCourse(id: string): Promise<Course> {
  return request.get(`/courses/${id}`);
}

export function createCourse(data: Partial<Course>) {
  return request.post('/courses', data);
}

export function updateCourse(id: string, data: Partial<Course>) {
  return request.put(`/courses/${id}`, data);
}

export function updateCourseStatus(id: string, status: string) {
  return request.put(`/courses/${id}/status`, { status });
}

export function toggleRecommend(id: string) {
  return request.put(`/courses/${id}/recommend`);
}

export function uploadFile(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
