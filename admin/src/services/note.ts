import request from '../utils/request';

export interface Note {
  id: string;
  studentId: string;
  contentType: string;
  content: string;
  images: string[];
  videoUrl: string | null;
  courseId: string | null;
  classGroupId: string | null;
  likes: number;
  comments: number;
  createdAt: string;
  student?: {
    id: string;
    user: { nickname: string | null; avatar: string | null };
  };
  course?: { id: string; name: string } | null;
  classGroup?: { id: string; name: string } | null;
}

export interface NoteListResult {
  items: Note[];
  total: number;
  page: number;
  pageSize: number;
}

export function getAdminNotes(params?: {
  page?: number;
  pageSize?: number;
  courseId?: string;
  classGroupId?: string;
  keyword?: string;
}): Promise<NoteListResult> {
  return request.get('/notes/admin/list', { params });
}

export function deleteAdminNote(id: string) {
  return request.delete(`/notes/admin/${id}`);
}
