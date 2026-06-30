import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Spin, Empty } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import {
  TeamOutlined,
  UserOutlined,
  BookOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../../services/dashboard';
import type { DashboardData, DashboardSchedule, DashboardOrder } from '../../services/dashboard';
import dayjs from 'dayjs';

const { Title } = Typography;

const scheduleStatusMap: Record<string, { label: string; color: string }> = {
  scheduled: { label: '待上课', color: 'blue' },
  ongoing: { label: '进行中', color: 'green' },
  completed: { label: '已完成', color: 'default' },
  canceled: { label: '已取消', color: 'red' },
};

const orderStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待付款', color: 'orange' },
  paid: { label: '已付款', color: 'green' },
  cancelled: { label: '已取消', color: 'default' },
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDashboardStats();
      setData(res);
    } catch {
      // error handled by request interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  const { stats, pending, todaySchedules, recentOrders } = data;


  const orderColumns = [
    {
      title: '学员',
      width: 120,
      render: (_: unknown, r: DashboardOrder) => r.student?.user?.nickname || r.student?.user?.phone || '-',
    },
    {
      title: '课程',
      dataIndex: ['course', 'name'],
      ellipsis: true,
    },
    {
      title: '金额',
      width: 90,
      render: (_: unknown, r: DashboardOrder) => `¥${r.amount}`,
    },
    {
      title: '状态',
      width: 90,
      render: (_: unknown, r: DashboardOrder) => {
        const s = orderStatusMap[r.status] || { label: r.status, color: 'default' };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '时间',
      width: 110,
      render: (_: unknown, r: DashboardOrder) => dayjs(r.createdAt).format('MM-DD HH:mm'),
    },
  ];

  const pendingItems = [
    { key: 'orders', label: '待确认订单', count: pending.orders, icon: <ShoppingCartOutlined />, path: '/orders' },
    { key: 'teacherApps', label: '教师申请', count: pending.teacherApplications, icon: <SolutionOutlined />, path: '/teacher-applications' },
    { key: 'venueApps', label: '场地申请', count: pending.venueApplications, icon: <EnvironmentOutlined />, path: '/venue-applications' },
    { key: 'trialBookings', label: '试听预约', count: pending.trialBookings, icon: <PhoneOutlined />, path: '/trial-bookings' },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>仪表盘</Title>

      {/* 核心指标 */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={12} md={6}>
          <Card hoverable>
            <Statistic title="学员总数" value={stats.studentCount} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card hoverable>
            <Statistic title="在职教师" value={stats.teacherCount} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card hoverable>
            <Statistic title="已发布课程" value={stats.courseCount} prefix={<BookOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card hoverable>
            <Statistic title="累计营收" value={stats.totalRevenue} prefix={<DollarOutlined />} precision={2} suffix="元" />
          </Card>
        </Col>
      </Row>

      {/* 待办事项 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {pendingItems.map(item => (
          <Col xs={12} sm={12} md={6} key={item.key}>
            <Card
              hoverable
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(item.path)}
            >
              <Statistic
                title={item.label}
                value={item.count}
                prefix={item.icon}
                valueStyle={item.count > 0 ? { color: '#cf1322' } : undefined}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 今日排课 & 近期订单 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="今日排课">
            {todaySchedules.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="今日暂无排课" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {todaySchedules.map((s) => {
                  const status = scheduleStatusMap[s.status] || { label: s.status, color: 'default' };
                  const venue = s.classroom?.venue?.name || '';
                  const room = s.classroom?.name || '';
                  const location = venue ? `${venue} - ${room}` : room;
                  return (
                    <Card
                      key={s.id}
                      size="small"
                      style={{ background: '#fafafa' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span><ClockCircleOutlined style={{ marginRight: 4 }} />{dayjs(s.startTime).format('HH:mm')} - {dayjs(s.endTime).format('HH:mm')}</span>
                            {s.classGroup?.name && <span style={{ color: '#555' }}>{s.classGroup.name}</span>}
                            {s.teacher?.realName && <span style={{ color: '#555' }}>{s.teacher.realName}</span>}
                            <Tag color={status.color} style={{ marginRight: 0 }}>{status.label}</Tag>
                          </div>
                          <div style={{ color: '#888', fontSize: 13, display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                            <span style={{ fontWeight: 500, color: '#333' }}>{s.course?.name}</span>
                            {location && <span>{location}</span>}
                            <span>第{s.lessonNumber}节课 / 共{s.totalLessons}节课</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="近期订单" styles={{ body: { padding: 0 } }}>
            <Table
              dataSource={recentOrders}
              columns={orderColumns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: '暂无订单' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
