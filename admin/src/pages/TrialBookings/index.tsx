import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Input,
  Select,
  Space,
  Tag,
  Button,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PhoneOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import request from '../../utils/request';

interface TrialBooking {
  id: string;
  name: string;
  phone: string;
  preferDate: string | null;
  status: string;
  remark: string | null;
  createdAt: string;
  course: { id: string; name: string } | null;
  user: { id: string; nickname: string; avatar: string } | null;
  _count: { followUps: number };
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待跟进', color: 'red' },
  contacted: { label: '已联系', color: 'blue' },
  scheduled: { label: '已安排', color: 'orange' },
  completed: { label: '已试听', color: 'green' },
  converted: { label: '已转化', color: 'geekblue' },
  cancelled: { label: '已取消', color: 'default' },
};

export default function TrialBookings() {
  const navigate = useNavigate();
  const [data, setData] = useState<TrialBooking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<{
    page: number;
    pageSize: number;
    status?: string;
    keyword?: string;
  }>({ page: 1, pageSize: 10 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await request.get('/trial-bookings', { params: query });
      setData(res.items || []);
      setTotal(res.total || 0);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: ColumnsType<TrialBooking> = [
    {
      title: '客户姓名',
      dataIndex: 'name',
      width: 120,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 130,
      render: (v: string) => (
        <Space>
          <PhoneOutlined />
          <span>{v || '-'}</span>
        </Space>
      ),
    },
    {
      title: '课程',
      key: 'course',
      width: 160,
      ellipsis: true,
      render: (_: unknown, r: TrialBooking) => r.course?.name || '-',
    },
    {
      title: '期望日期',
      dataIndex: 'preferDate',
      width: 120,
      render: (v: string | null) =>
        v ? (
          <Space>
            <CalendarOutlined />
            <span>{dayjs(v).format('YYYY-MM-DD')}</span>
          </Space>
        ) : (
          <span style={{ color: '#ccc' }}>未指定</span>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => {
        const s = statusMap[v] || { label: v, color: 'default' };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '跟进次数',
      key: 'followUps',
      width: 90,
      render: (_: unknown, r: TrialBooking) => (
        <span>{r._count?.followUps || 0} 次</span>
      ),
    },
    {
      title: '注册用户',
      key: 'user',
      width: 100,
      render: (_: unknown, r: TrialBooking) =>
        r.user ? (
          <Tag color="blue">{r.user.nickname || '已注册'}</Tag>
        ) : (
          <span style={{ color: '#ccc' }}>未注册</span>
        ),
    },
    {
      title: '预约时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, r: TrialBooking) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/trial-bookings/${r.id}`)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <Card title="试听管理">
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="全部状态"
          allowClear
          style={{ width: 140 }}
          onChange={(v) => setQuery((q) => ({ ...q, status: v, page: 1 }))}
          options={Object.entries(statusMap).map(([k, v]) => ({
            label: v.label,
            value: k,
          }))}
        />
        <Input.Search
          placeholder="搜索姓名/手机号"
          allowClear
          style={{ width: 220 }}
          onSearch={(v) =>
            setQuery((q) => ({ ...q, keyword: v || undefined, page: 1 }))
          }
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (page, pageSize) => setQuery((q) => ({ ...q, page, pageSize })),
        }}
      />
    </Card>
  );
}
