import request from '../utils/request';

export interface ClassGroup {
  id: string;
  courseId: string;
  name: string;
  status: 'forming' | 'scheduled' | 'active' | 'completed';
  maxStudents: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  course?: { id: string; name: string };
  _count?: { students: number; schedules: number };
}

export interface ClassGroupStudent {
  classGroupId: string;
  studentId: string;
  enrolledAt: string;
  student?: {
    id: string;
    userId: string;
    user?: { phone: string; nickname: string | null; avatar: string | null };
  };
}

export interface ClassGroupDetail extends ClassGroup {
  students: ClassGroupStudent[];
  course?: { id: string; name: string; totalHours: number; price: string };
  scheduledHours?: number;
}

export interface UnassignedStudent {
  id: string;
  userId: string;
  user: { phone: string; nickname: string | null; avatar: string | null };
  order: { id: string; amount: string; createdAt: string } | null;
}

export interface ClassGroupListResult {
  items: ClassGroup[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== API ====================

export function getClassGroups(params?: {
  page?: number;
  pageSize?: number;
  courseId?: string;
  status?: string;
  keyword?: string;
}): Promise<ClassGroupListResult> {
  return request.get('/class-groups', { params });
}

export function getClassGroup(id: string): Promise<ClassGroupDetail> {
  return request.get(`/class-groups/${id}`);
}

export function createClassGroup(data: {
  name: string;
  courseId: string;
  maxStudents?: number;
  startDate?: string;
  endDate?: string;
  studentIds?: string[];
  status?: string;
}): Promise<ClassGroup> {
  return request.post('/class-groups', data);
}

export function updateClassGroup(
  id: string,
  data: {
    name?: string;
    maxStudents?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
  },
): Promise<ClassGroup> {
  return request.put(`/class-groups/${id}`, data);
}

export function addStudentsToClassGroup(
  id: string,
  studentIds: string[],
): Promise<ClassGroupDetail> {
  return request.post(`/class-groups/${id}/students`, { studentIds });
}

export function removeStudentFromClassGroup(
  id: string,
  studentId: string,
): Promise<{ success: boolean }> {
  return request.delete(`/class-groups/${id}/students/${studentId}`);
}

export function getUnassignedStudents(
  courseId: string,
): Promise<UnassignedStudent[]> {
  return request.get('/class-groups/unassigned-students', {
    params: { courseId },
  });
}

export function changeClassGroupStatus(
  id: string,
  status: string,
): Promise<ClassGroup> {
  return request.put(`/class-groups/${id}/status`, { status });
}
