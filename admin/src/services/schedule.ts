import request from '../utils/request';

export interface Schedule {
  id: string;
  courseId: string;
  classroomId: string;
  teacherId: string;
  assistantId: string | null;
  classGroupId: string | null;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'canceled';
  createdBy: string;
  course?: { id: string; name: string; totalHours: number };
  classroom?: { id: string; name: string; capacity: number; venue?: { id: string; name: string } };
  teacher?: { id: string; realName: string };
  assistant?: { id: string; nickname: string; phone: string } | null;
  creator?: { id: string; nickname: string };
  classGroup?: { id: string; name: string; status: string } | null;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  color: string;
  extendedProps: {
    courseId: string;
    courseName: string;
    classroomId: string;
    classroomName: string;
    venueName: string;
    teacherId: string;
    teacherName: string;
    assistantId: string | null;
    assistantName: string | null;
    status: string;
    classGroupId: string | null;
    classGroupName: string | null;
  };
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: { type: 'classroom' | 'teacher' | 'assistant'; schedule: Schedule }[];
}

// 列表
export async function getSchedules(params: {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  classroomId?: string;
  teacherId?: string;
  courseId?: string;
  classGroupId?: string;
  status?: string;
}): Promise<{ items: Schedule[]; total: number }> {
  return request.get('/schedules', { params });
}

// 日历事件
export async function getCalendarEvents(params: {
  dateFrom: string;
  dateTo: string;
  classroomId?: string;
  teacherId?: string;
  classGroupId?: string;
}): Promise<ScheduleEvent[]> {
  return request.get('/schedules/calendar', { params });
}

// 详情
export async function getSchedule(id: string): Promise<Schedule> {
  return request.get(`/schedules/${id}`);
}

// 创建
export async function createSchedule(data: {
  courseId: string;
  classroomId: string;
  teacherId: string;
  assistantId?: string;
  classGroupId?: string;
  startTime: string;
  endTime: string;
}): Promise<Schedule> {
  return request.post('/schedules', data);
}

// 修改
export async function updateSchedule(id: string, data: Partial<{
  courseId: string;
  classroomId: string;
  teacherId: string;
  assistantId: string;
  classGroupId: string;
  startTime: string;
  endTime: string;
}>): Promise<Schedule> {
  return request.put(`/schedules/${id}`, data);
}

// 取消
export async function cancelSchedule(id: string): Promise<Schedule> {
  return request.put(`/schedules/${id}/cancel`);
}

// 状态流转
export async function updateScheduleStatus(id: string, status: 'ongoing' | 'completed'): Promise<Schedule> {
  return request.put(`/schedules/${id}/status`, { status });
}

// 冲突检测
export async function checkConflicts(data: {
  classroomId: string;
  teacherId: string;
  assistantId?: string;
  startTime: string;
  endTime: string;
  excludeId?: string;
}): Promise<ConflictResult> {
  return request.post('/schedules/check-conflicts', data);
}

// ==================== 教室已占用时段 ====================

export interface OccupiedSlot {
  id: string;
  date: string;
  weekday: number;
  startTime: string;
  endTime: string;
  courseName: string;
}

export async function getClassroomOccupied(
  classroomId: string,
  dateFrom: string,
): Promise<OccupiedSlot[]> {
  return request.get('/schedules/classroom-occupied', {
    params: { classroomId, dateFrom },
  });
}

// ==================== 批量排课 ====================

export interface BatchRule {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface BatchCreateParams {
  courseId: string;
  classGroupId?: string;
  classroomId: string;
  teacherId: string;
  assistantId?: string;
  rules: BatchRule[];
  dateFrom: string;
  dateTo: string;
  skipDates?: string[];
}

export interface BatchPreviewItem {
  date: string;
  weekday: number;
  startTime: string;
  endTime: string;
  hasConflict: boolean;
  conflictReasons: string[];
}

export interface BatchPreviewResult {
  totalCount: number;
  scheduledHours: number;
  courseHours: number;
  items: BatchPreviewItem[];
}

export interface BatchCreateResult {
  createdCount: number;
  skippedCount: number;
  skipped: { date: string; startTime: string; endTime: string; reasons: string[] }[];
}

export async function batchPreview(data: BatchCreateParams): Promise<BatchPreviewResult> {
  return request.post('/schedules/batch-preview', data);
}

export async function batchCreateSchedule(data: BatchCreateParams): Promise<BatchCreateResult> {
  return request.post('/schedules/batch', data);
}
