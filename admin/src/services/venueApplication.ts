import request from '../utils/request';

export interface VenueApplication {
  id: string;
  userId: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  trafficInfo: string | null;
  area: number | null;
  photos: string[] | null;
  status: 'pending' | 'approved' | 'rejected';
  auditRemark: string | null;
  createdAt: string;
  user?: {
    nickname: string | null;
    phone: string | null;
    avatar: string | null;
  };
}

export interface VenueApplicationListResult {
  items: VenueApplication[];
  total: number;
  page: number;
  pageSize: number;
}

export function getVenueApplications(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<VenueApplicationListResult> {
  return request.get('/venue-applications', { params });
}

export function getVenueApplication(
  id: string,
): Promise<VenueApplication> {
  return request.get(`/venue-applications/${id}`);
}

export function auditVenueApplication(
  id: string,
  data: { status: 'approved' | 'rejected'; auditRemark?: string },
): Promise<VenueApplication> {
  return request.put(`/venue-applications/${id}/audit`, data);
}
