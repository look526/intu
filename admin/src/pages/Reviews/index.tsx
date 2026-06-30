import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Select, Space, Rate } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getReviews, type Review } from '../../services/review';
import { getCourses, type Course } from '../../services/course';
import { getTeachers, type Teacher } from '../../services/teacher';

export default function Reviews() {
  const [list, setList] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [query, setQuery] = useState<{
    page: number;
    pageSize: number;
    courseId?: string;
    teacherId?: string;
  }>({ page: 1, pageSize: 10 });

  useEffect(() => {
    getCourses({ pageSize: 200 }).then((res) => setCourses(res.items || []));
    getTeachers({ pageSize: 200 }).then((res) => setTeachers(res.items || []));
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getReviews(query);
      setList(res.items || []);
      setTotal(res.total || 0);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const columns: ColumnsType<Review> = [
    {
      title: '学员',
      width: 120,
      render: (_: unknown, r: Review) => r.student?.user?.nickname || '-',
    },
    {
      title: '课程',
      width: 160,
      render: (_: unknown, r: Review) => r.schedule?.course?.name || '-',
    },
    {
      title: '教师',
      width: 100,
      render: (_: unknown, r: Review) => r.schedule?.teacher?.realName || '-',
    },
    {
      title: '评分',
      width: 180,
      render: (_: unknown, r: Review) => <Rate disabled value={r.rating} style={{ fontSize: 14 }} />,
    },
    {
      title: '评价内容',
      dataIndex: 'content',
      ellipsis: true,
      render: (v: string | null) => v || '-',
    },
    {
      title: '评价时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <Card title="评价管理">
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
        <Select
          placeholder="全部教师"
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: 160 }}
          onChange={(v) => setQuery((q) => ({ ...q, teacherId: v, page: 1 }))}
          options={teachers.map((t) => ({ label: t.realName, value: t.id }))}
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
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
