import request from '../utils/request';

export interface Venue {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  trafficInfo: string | null;
  area: number | null;
  photos: string[] | null;
  status: 'pending' | 'approved' | 'rejected' | 'offline';
  auditRemark: string | null;
  isSiteVisited: boolean;
  siteVisitNote: string | null;
  siteVisitDate: string | null;
  createdAt: string;
  owner?: { phone: string; nickname: string | null };
  _count?: { classrooms: number };
  classrooms?: Classroom[];
}

export interface Classroom {
  id: string;
  venueId: string;
  name: string;
  capacity: number;
  resources: string[] | null;
  timeSlots: any[] | null;
  status: 'active' | 'maintenance';
}

export interface VenueListResult {
  items: Venue[];
  total: number;
  page: number;
  pageSize: number;
}

export function getVenues(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}): Promise<VenueListResult> {
  return request.get('/venues', { params });
}

export function getVenue(id: string): Promise<Venue> {
  return request.get(`/venues/${id}`);
}

export function createVenue(data: Partial<Venue>) {
  return request.post('/venues', data);
}

export function updateVenue(id: string, data: Partial<Venue>) {
  return request.put(`/venues/${id}`, data);
}

export function auditVenue(id: string, status: string, auditRemark?: string) {
  return request.put(`/venues/${id}/audit`, { status, auditRemark });
}

export function updateVenueStatus(id: string, status: string) {
  return request.put(`/venues/${id}/status`, { status });
}

export function markSiteVisit(id: string, note?: string) {
  return request.put(`/venues/${id}/site-visit`, { note });
}

// ==================== 教室 ====================

export function getClassrooms(venueId: string): Promise<Classroom[]> {
  return request.get(`/venues/${venueId}/classrooms`);
}

export function createClassroom(venueId: string, data: Partial<Classroom>) {
  return request.post(`/venues/${venueId}/classrooms`, data);
}

export function updateClassroom(id: string, data: Partial<Classroom>) {
  return request.put(`/classrooms/${id}`, data);
}

export function deleteClassroom(id: string) {
  return request.delete(`/classrooms/${id}`);
}

export function updateClassroomStatus(id: string, status: string) {
  return request.put(`/classrooms/${id}/status`, { status });
}
