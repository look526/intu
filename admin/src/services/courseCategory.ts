import request from '../utils/request';

export interface CourseCategory {
  id: number;
  name: string;
  icon: string | null;
  priority: number;
  _count: { courses: number };
}

export function getCategories(): Promise<CourseCategory[]> {
  return request.get('/course-categories');
}

export function createCategory(data: { name: string; icon?: string; priority?: number }) {
  return request.post('/course-categories', data);
}

export function updateCategory(id: number, data: { name?: string; icon?: string; priority?: number }) {
  return request.put(`/course-categories/${id}`, data);
}

export function deleteCategory(id: number) {
  return request.delete(`/course-categories/${id}`);
}

export function sortCategories(items: { id: number; priority: number }[]) {
  return request.put('/course-categories/sort', { items });
}
