import request from '../utils/request';

export interface Order {
  id: string;
  studentId: string;
  courseId: string;
  amount: string;
  status: 'pending' | 'paid' | 'cancelled';
  paidAt: string | null;
  createdAt: string;
  student?: {
    id: string;
    userId: string;
    user?: { phone: string; nickname: string | null };
  };
  course?: {
    id: string;
    name: string;
    coverImage: string | null;
    totalHours: number;
    price: string;
    teacher?: { id: string; realName: string };
  };
}

export interface OrderListResult {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export function getOrders(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}): Promise<OrderListResult> {
  return request.get('/orders', { params });
}

export function getOrder(id: string): Promise<Order> {
  return request.get(`/orders/${id}`);
}

export function confirmPaid(id: string): Promise<Order> {
  return request.put(`/orders/${id}/confirm-paid`);
}

export function cancelOrder(id: string): Promise<Order> {
  return request.put(`/orders/${id}/cancel`);
}
