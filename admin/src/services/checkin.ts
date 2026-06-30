import request from '../utils/request';

export interface CheckinRecord {
  id: string;
  studentId: string;
  scheduleId: string;
  checkinTime: string;
  locationValid: boolean;
  creditEarned: number;
  student?: {
    id: string;
    user: { nickname: string | null; avatar: string | null };
  };
  schedule?: {
    course: { id: string; name: string };
    classroom: {
      name: string;
      venue: { name: string };
    };
  };
}

export interface CheckinListResult {
  items: CheckinRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export function getAdminCheckins(params?: {
  page?: number;
  pageSize?: number;
  courseId?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}): Promise<CheckinListResult> {
  return request.get('/checkin/admin/list', { params });
}
