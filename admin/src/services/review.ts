import request from '../utils/request';

export interface Review {
  id: string;
  rating: number;
  content: string | null;
  createdAt: string;
  student?: {
    id: string;
    user?: { nickname: string | null; avatar: string | null };
  };
  schedule?: {
    id: string;
    startTime: string;
    course?: { name: string };
    teacher?: { realName: string };
  };
}

export interface ReviewListResult {
  items: Review[];
  total: number;
  page: number;
  pageSize: number;
}

export function getReviews(params?: {
  page?: number;
  pageSize?: number;
  courseId?: string;
  teacherId?: string;
}): Promise<ReviewListResult> {
  return request.get('/reviews', { params });
}
