import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Select, Space, Tag, DatePicker, Input, Avatar, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UserOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAdminCheckins, type CheckinRecord } from '../../services/checkin';
import { getCourses, type Course } from '../../services/course';

const { RangePicker } = DatePicker;

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const resolveUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function Checkins() {
  const [data, setData] = useState<CheckinRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState<{
    page: number;
    pageSize: number;
    courseId?: string;
    keyword?: string;
    startDate?: string;
    endDate?: string;
  }>({ page: 1, pageSize: 10 });

  useEffect(() => {
    getCourses({ pageSize: 200 }).then((res) => setCourses(res.items || []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminCheckins(query);
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: ColumnsType<CheckinRecord> = [
    {
      title: '学员',
      key: 'student',
      width: 140,
      render: (_: unknown, r: CheckinRecord) => (
        <Space>
          <Avatar
            size={28}
            src={resolveUrl(r.student?.user?.avatar) || undefined}
            icon={!r.student?.user?.avatar ? <UserOutlined /> : undefined}
          />
          <span>{r.student?.user?.nickname || '-'}</span>
        </Space>
      ),
    },
    {
      title: '课程',
      key: 'course',
      width: 160,
      render: (_: unknown, r: CheckinRecord) => r.schedule?.course?.name || '-',
    },
    {
      title: '教室/场地',
      key: 'venue',
      width: 180,
      render: (_: unknown, r: CheckinRecord) => {
        const classroom = r.schedule?.classroom;
        if (!classroom) return '-';
        return `${classroom.venue?.name} - ${classroom.name}`;
      },
    },
    {
      title: '打卡时间',
      dataIndex: 'checkinTime',
      width: 160,
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '位置有效',
      dataIndex: 'locationValid',
      width: 100,
      render: (v: boolean) =>
        v ? (
          <Tag icon={<CheckCircleOutlined />} color="success">有效</Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">无效</Tag>
        ),
    },
    {
      title: '获得学分',
      dataIndex: 'creditEarned',
      width: 90,
      render: (v: number) => (v > 0 ? <Tag color="blue">+{v}</Tag> : <span>0</span>),
    },
  ];

  return (
    <Card title="打卡管理">
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="全部课程"
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: 200 }}
          onChange={(v) => setQuery((q) => ({ ...q, courseId: v, page: 1 }))}
          options={courses.map((c) => ({ label: c.name, value: c.id }))}
        />
        <RangePicker
          onChange={(_, dateStrings) => {
            setQuery((q) => ({
              ...q,
              startDate: dateStrings[0] || undefined,
              endDate: dateStrings[1] || undefined,
              page: 1,
            }));
          }}
        />
        <Input.Search
          placeholder="搜索学员"
          allowClear
          style={{ width: 200 }}
          onSearch={(v) => setQuery((q) => ({ ...q, keyword: v || undefined, page: 1 }))}
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
