import request from '../utils/request';

export interface Feedback {
  id: string;
  userId: string;
  type: string;
  content: string;
  images: string[];
  contact: string | null;
  status: string;
  reply: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    nickname: string | null;
    avatar: string | null;
    phone: string | null;
  };
}

export interface FeedbackListResult {
  data: Feedback[];
  total: number;
  page: number;
  pageSize: number;
}

export function getFeedbacks(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<FeedbackListResult> {
  return request.get('/feedback', { params });
}

export function replyFeedback(id: string, reply: string) {
  return request.put(`/feedback/${id}/reply`, { reply });
}

export function updateFeedbackStatus(id: string, status: string) {
  return request.put(`/feedback/${id}/status`, { status });
}
