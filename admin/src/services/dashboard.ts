import request from '../utils/request';

export interface DashboardStats {
  studentCount: number;
  teacherCount: number;
  courseCount: number;
  totalRevenue: number;
}

export interface DashboardPending {
  orders: number;
  teacherApplications: number;
  venueApplications: number;
  trialBookings: number;
}

export interface DashboardSchedule {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  lessonNumber: number;
  totalLessons: number;
  course?: { id: string; name: string };
  teacher?: { id: string; realName: string };
  classroom?: { id: string; name: string; venue?: { id: string; name: string } };
  classGroup?: { id: string; name: string } | null;
}

export interface DashboardOrder {
  id: string;
  amount: string;
  status: string;
  createdAt: string;
  student?: { id: string; user?: { nickname: string | null; phone: string | null } };
  course?: { id: string; name: string };
}

export interface DashboardData {
  stats: DashboardStats;
  pending: DashboardPending;
  todaySchedules: DashboardSchedule[];
  recentOrders: DashboardOrder[];
}

export function getDashboardStats(): Promise<DashboardData> {
  return request.get('/dashboard/stats');
}
