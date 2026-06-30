import { Layout, Menu, theme } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  BookOutlined,
  TeamOutlined,
  BankOutlined,
  CalendarOutlined,
  ShoppingCartOutlined,
  SettingOutlined,
  AppstoreOutlined,
  UsergroupAddOutlined,
  StarOutlined,
  AuditOutlined,
  FileSearchOutlined,
  UserOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  CommentOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/courses', icon: <BookOutlined />, label: '课程管理' },
  { key: '/course-categories', icon: <AppstoreOutlined />, label: '课程分类' },
  { key: '/teachers', icon: <TeamOutlined />, label: '老师管理' },
  { key: '/teacher-applications', icon: <AuditOutlined />, label: '老师申请' },
  { key: '/venues', icon: <BankOutlined />, label: '场地管理' },
  { key: '/venue-applications', icon: <FileSearchOutlined />, label: '场地申请' },
  { key: '/schedules', icon: <CalendarOutlined />, label: '排课管理' },
  { key: '/class-groups', icon: <UsergroupAddOutlined />, label: '班级管理' },
  { key: '/orders', icon: <ShoppingCartOutlined />, label: '订单管理' },
  { key: '/reviews', icon: <StarOutlined />, label: '评价管理' },
  { key: '/students', icon: <UserOutlined />, label: '学员管理' },
  { key: '/notes', icon: <FileTextOutlined />, label: '笔记管理' },
  { key: '/checkins', icon: <CheckCircleOutlined />, label: '打卡管理' },
  { key: '/trial-bookings', icon: <PhoneOutlined />, label: '试听管理' },
  { key: '/feedbacks', icon: <CommentOutlined />, label: '意见反馈' },
  { key: '/system-config', icon: <SettingOutlined />, label: '系统配置' },
];

export default function BasicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="80">
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 18,
            fontWeight: 'bold',
          }}
        >
          趣学坊
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            fontSize: 14,
            color: '#999',
          }}
        >
          后台管理系统
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
