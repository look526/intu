import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Tag, Select, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getTeacherApplications,
  type TeacherApplication,
} from '../../services/teacherApplication';

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'processing' },
  approved: { text: '已通过', color: 'success' },
  rejected: { text: '已驳回', color: 'error' },
};

export default function TeacherApplications() {
  const navigate = useNavigate();
  const [list, setList] = useState<TeacherApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<{
    page: number;
    pageSize: number;
    status?: string;
  }>({ page: 1, pageSize: 10 });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTeacherApplications(query);
      setList(res.items || []);
      setTotal(res.total || 0);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const columns: ColumnsType<TeacherApplication> = [
    {
      title: '申请人',
      width: 120,
      render: (_: unknown, r: TeacherApplication) =>
        r.user?.nickname || r.realName,
    },
    {
      title: '手机号',
      width: 130,
      render: (_: unknown, r: TeacherApplication) => r.phone || '-',
    },
    {
      title: '擅长领域',
      dataIndex: 'specialties',
      width: 160,
      ellipsis: true,
    },
    {
      title: '教学年限',
      dataIndex: 'teachingYears',
      width: 100,
      render: (v: number) => `${v}年`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => {
        const m = statusMap[s] || { text: s, color: 'default' };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 100,
      render: (_: unknown, r: TeacherApplication) => (
        <a onClick={() => navigate(`/teacher-applications/${r.id}`)}>
          查看详情
        </a>
      ),
    },
  ];

  return (
    <Card title="老师申请管理">
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="全部状态"
          allowClear
          style={{ width: 140 }}
          onChange={(v) => setQuery((q) => ({ ...q, status: v, page: 1 }))}
          options={Object.entries(statusMap).map(([k, v]) => ({
            label: v.text,
            value: k,
          }))}
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
          onChange: (page, pageSize) =>
            setQuery((q) => ({ ...q, page, pageSize })),
        }}
      />
    </Card>
  );
}
