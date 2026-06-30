import request from '../utils/request';

export interface Student {
  id: string;
  userId: string;
  credits: number;
  hutSource: string | null;
  stewardId: string | null;
  user?: {
    nickname: string | null;
    avatar: string | null;
    phone: string | null;
    createdAt?: string;
  };
  _count?: {
    orders: number;
    classGroupStudents: number;
    checkinRecords: number;
    notes: number;
    courseReviews?: number;
  };
  orders?: any[];
  classGroupStudents?: any[];
}

export interface StudentListResult {
  items: Student[];
  total: number;
  page: number;
  pageSize: number;
}

export function getStudents(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}): Promise<StudentListResult> {
  return request.get('/students', { params });
}

export function getStudent(id: string): Promise<Student> {
  return request.get(`/students/${id}`);
}

export interface UserOption {
  id: string;
  nickname: string | null;
  phone: string | null;
  avatar: string | null;
}

export function searchUsers(keyword: string): Promise<UserOption[]> {
  return request.get('/students/search', { params: { keyword } });
}
