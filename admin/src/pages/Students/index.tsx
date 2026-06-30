import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Input, Avatar, Button, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getStudents, type Student } from '../../services/student';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const resolveUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function Students() {
  const navigate = useNavigate();
  const [data, setData] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [keyword, setKeyword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudents({ page, pageSize, keyword: keyword || undefined });
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: ColumnsType<Student> = [
    {
      title: '头像',
      key: 'avatar',
      width: 60,
      render: (_: unknown, r: Student) => (
        <Avatar size={36} src={resolveUrl(r.user?.avatar) || undefined} icon={!r.user?.avatar ? <UserOutlined /> : undefined} />
      ),
    },
    {
      title: '昵称',
      key: 'nickname',
      width: 120,
      render: (_: unknown, r: Student) => r.user?.nickname || '-',
    },
    {
      title: '手机号',
      key: 'phone',
      width: 130,
      render: (_: unknown, r: Student) => r.user?.phone || '-',
    },
    {
      title: '积分',
      dataIndex: 'credits',
      width: 80,
    },
    {
      title: '来源',
      dataIndex: 'hutSource',
      width: 100,
      render: (v: string | null) => v || '-',
    },
    {
      title: '班级数',
      key: 'classCount',
      width: 80,
      render: (_: unknown, r: Student) => r._count?.classGroupStudents ?? 0,
    },
    {
      title: '订单数',
      key: 'orderCount',
      width: 80,
      render: (_: unknown, r: Student) => r._count?.orders ?? 0,
    },
    {
      title: '笔记数',
      key: 'noteCount',
      width: 80,
      render: (_: unknown, r: Student) => r._count?.notes ?? 0,
    },
    {
      title: '打卡数',
      key: 'checkinCount',
      width: 80,
      render: (_: unknown, r: Student) => r._count?.checkinRecords ?? 0,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, r: Student) => (
        <Button type="link" size="small" onClick={() => navigate(`/students/${r.id}`)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <Card title="学员管理">
      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索昵称/手机号"
          allowClear
          style={{ width: 240 }}
          onSearch={(v) => {
            setKeyword(v);
            setPage(1);
          }}
        />
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p) => setPage(p),
        }}
      />
    </Card>
  );
}
