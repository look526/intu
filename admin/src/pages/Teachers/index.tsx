import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Rate,
  Avatar,
} from 'antd';
import { StarOutlined, StarFilled, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  getTeachers,
  updateTeacherStatus,
  toggleTeacherRecommend,
  type Teacher,
} from '../../services/teacher';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const trainingStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待培训', color: 'default' },
  passed: { text: '已通过', color: 'green' },
  failed: { text: '未通过', color: 'red' },
};

const teacherStatusMap: Record<string, { text: string; color: string }> = {
  active: { text: '活跃', color: 'green' },
  frozen: { text: '冻结', color: 'red' },
};

export default function Teachers() {
  const navigate = useNavigate();
  const [data, setData] = useState<Teacher[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [trainingStatus, setTrainingStatus] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [keyword, setKeyword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTeachers({
        page,
        pageSize,
        trainingStatus,
        status,
        keyword: keyword || undefined,
      });
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, trainingStatus, status, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusToggle = async (record: Teacher) => {
    const newStatus = record.status === 'active' ? 'frozen' : 'active';
    await updateTeacherStatus(record.id, newStatus);
    message.success('操作成功');
    load();
  };

  const handleRecommendToggle = async (record: Teacher) => {
    await toggleTeacherRecommend(record.id);
    message.success('操作成功');
    load();
  };

  const columns = [
    {
      title: '头像',
      key: 'avatar',
      width: 60,
      render: (_: any, r: Teacher) => {
        const src = r.user?.avatar
          ? (r.user.avatar.startsWith('http') ? r.user.avatar : `${API_BASE}${r.user.avatar}`)
          : '';
        return <Avatar size={36} src={src || undefined} icon={!src ? <UserOutlined /> : undefined} />;
      },
    },
    {
      title: '姓名',
      dataIndex: 'realName',
      width: 100,
    },
    {
      title: '手机号',
      key: 'phone',
      width: 130,
      render: (_: any, r: Teacher) => r.user?.phone || '-',
    },
    {
      title: '专长',
      dataIndex: 'specialties',
      width: 160,
      render: (v: string | null) =>
        v
          ? v.split(',').map((s) => (
              <Tag key={s} color="blue">
                {s}
              </Tag>
            ))
          : '-',
    },
    {
      title: '培训状态',
      dataIndex: 'trainingStatus',
      width: 100,
      render: (v: string) => {
        const m = trainingStatusMap[v] || { text: v, color: 'default' };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: '评分',
      dataIndex: 'rating',
      width: 140,
      render: (v: string) => (
        <Rate disabled allowHalf value={parseFloat(v)} style={{ fontSize: 14 }} />
      ),
    },
    {
      title: '课程数',
      key: 'courseCount',
      width: 80,
      render: (_: any, r: Teacher) => r._count?.courses ?? 0,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: string) => {
        const m = teacherStatusMap[v] || { text: v, color: 'default' };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: '推荐',
      dataIndex: 'isRecommended',
      width: 60,
      render: (v: boolean, r: Teacher) =>
        v ? (
          <StarFilled
            style={{ color: '#faad14', cursor: 'pointer', fontSize: 18 }}
            onClick={() => handleRecommendToggle(r)}
          />
        ) : (
          <StarOutlined
            style={{ color: '#d9d9d9', cursor: 'pointer', fontSize: 18 }}
            onClick={() => handleRecommendToggle(r)}
          />
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, r: Teacher) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/teachers/${r.id}`)}>
            详情
          </Button>
          <Popconfirm
            title={r.status === 'active' ? '确定冻结该教师？' : '确定激活该教师？'}
            onConfirm={() => handleStatusToggle(r)}
          >
            <Button type="link" size="small" danger={r.status === 'active'}>
              {r.status === 'active' ? '冻结' : '激活'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="老师管理">
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="培训状态"
          allowClear
          style={{ width: 130 }}
          value={trainingStatus}
          onChange={(v) => {
            setTrainingStatus(v);
            setPage(1);
          }}
          options={[
            { label: '待培训', value: 'pending' },
            { label: '已通过', value: 'passed' },
            { label: '未通过', value: 'failed' },
          ]}
        />
        <Select
          placeholder="教师状态"
          allowClear
          style={{ width: 120 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { label: '活跃', value: 'active' },
            { label: '冻结', value: 'frozen' },
          ]}
        />
        <Input.Search
          placeholder="搜索姓名/专长"
          allowClear
          style={{ width: 200 }}
          onSearch={(v) => {
            setKeyword(v);
            setPage(1);
          }}
        />
      </Space>
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
