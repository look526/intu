import { useEffect, useState } from 'react';
import { Card, Descriptions, Avatar, Tag, Table, Tabs, Button, Spin } from 'antd';
import { ArrowLeftOutlined, UserOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getStudent, type Student } from '../../services/student';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const resolveUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

const orderStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待付款', color: 'default' },
  paid: { text: '已付款', color: 'green' },
  cancelled: { text: '已取消', color: 'red' },
};

const classStatusMap: Record<string, { text: string; color: string }> = {
  forming: { text: '组建中', color: 'default' },
  scheduled: { text: '已排课', color: 'blue' },
  active: { text: '进行中', color: 'green' },
  completed: { text: '已完成', color: 'gray' },
};

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getStudent(id)
      .then(setStudent)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (!student) {
    return <Card>学员不存在</Card>;
  }

  const orderColumns = [
    { title: '课程', key: 'course', render: (_: unknown, r: any) => r.course?.name || '-' },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 100,
      render: (v: string) => `¥${v}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => {
        const m = orderStatusMap[v] || { text: v, color: 'default' };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm'),
    },
  ];

  const classColumns = [
    { title: '班级', key: 'name', render: (_: unknown, r: any) => r.classGroup?.name || '-' },
    { title: '课程', key: 'course', render: (_: unknown, r: any) => r.classGroup?.course?.name || '-' },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: unknown, r: any) => {
        const s = r.classGroup?.status || '';
        const m = classStatusMap[s] || { text: s, color: 'default' };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: '加入时间',
      dataIndex: 'enrolledAt',
      width: 160,
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        type="link"
        onClick={() => navigate('/students')}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      <Card title="学员信息" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <Avatar
            size={72}
            src={resolveUrl(student.user?.avatar) || undefined}
            icon={!student.user?.avatar ? <UserOutlined /> : undefined}
          />
          <Descriptions column={2} bordered size="small" style={{ flex: 1 }}>
            <Descriptions.Item label="昵称">{student.user?.nickname || '-'}</Descriptions.Item>
            <Descriptions.Item label="手机号">{student.user?.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="积分">{student.credits}</Descriptions.Item>
            <Descriptions.Item label="来源">{student.hutSource || '-'}</Descriptions.Item>
            <Descriptions.Item label="推荐人ID">{student.stewardId || '-'}</Descriptions.Item>
            <Descriptions.Item label="注册时间">
              {student.user?.createdAt ? dayjs(student.user.createdAt).format('YYYY-MM-DD HH:mm') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="订单数">{student._count?.orders ?? 0}</Descriptions.Item>
            <Descriptions.Item label="班级数">{student._count?.classGroupStudents ?? 0}</Descriptions.Item>
            <Descriptions.Item label="打卡数">{student._count?.checkinRecords ?? 0}</Descriptions.Item>
            <Descriptions.Item label="笔记数">{student._count?.notes ?? 0}</Descriptions.Item>
          </Descriptions>
        </div>
      </Card>

      <Card>
        <Tabs
          items={[
            {
              key: 'orders',
              label: `订单记录 (${student.orders?.length || 0})`,
              children: (
                <Table
                  rowKey="id"
                  dataSource={student.orders || []}
                  columns={orderColumns}
                  pagination={false}
                  size="small"
                />
              ),
            },
            {
              key: 'classes',
              label: `加入班级 (${student.classGroupStudents?.length || 0})`,
              children: (
                <Table
                  rowKey={(r) => r.classGroupId || r.classGroup?.id}
                  dataSource={student.classGroupStudents || []}
                  columns={classColumns}
                  pagination={false}
                  size="small"
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
