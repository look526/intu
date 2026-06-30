import { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Select,
  Input,
  Button,
  Timeline,
  Space,
  Divider,
  message,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  PhoneOutlined,
  CalendarOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import request from '../../utils/request';

interface FollowUp {
  id: string;
  content: string;
  createdAt: string;
  admin: { id: string; nickname: string } | null;
}

interface TrialBookingDetail {
  id: string;
  name: string;
  phone: string;
  preferDate: string | null;
  status: string;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  course: { id: string; name: string; coverImage: string | null } | null;
  user: { id: string; nickname: string; avatar: string; phone: string } | null;
  followUps: FollowUp[];
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待跟进', color: 'red' },
  contacted: { label: '已联系', color: 'blue' },
  scheduled: { label: '已安排', color: 'orange' },
  completed: { label: '已试听', color: 'green' },
  converted: { label: '已转化', color: 'geekblue' },
  cancelled: { label: '已取消', color: 'default' },
};

export default function TrialBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<TrialBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [statusRemark, setStatusRemark] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [followContent, setFollowContent] = useState('');
  const [addingFollow, setAddingFollow] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await request.get(`/trial-bookings/${id}`);
      setDetail(res);
      setNewStatus(res.status);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const handleUpdateStatus = async () => {
    if (!newStatus || newStatus === detail?.status) {
      return message.warning('请选择新状态');
    }
    setUpdatingStatus(true);
    try {
      await request.patch(`/trial-bookings/${id}/status`, {
        status: newStatus,
        remark: statusRemark || undefined,
      });
      message.success('状态更新成功');
      setStatusRemark('');
      load();
    } catch {
      message.error('更新失败');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddFollowUp = async () => {
    if (!followContent.trim()) {
      return message.warning('请输入跟进内容');
    }
    setAddingFollow(true);
    try {
      await request.post(`/trial-bookings/${id}/follow-ups`, {
        content: followContent.trim(),
      });
      message.success('跟进记录已添加');
      setFollowContent('');
      load();
    } catch {
      message.error('添加失败');
    } finally {
      setAddingFollow(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!detail) {
    return <Card>预约记录不存在</Card>;
  }

  const st = statusMap[detail.status] || { label: detail.status, color: 'default' };

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        type="link"
        onClick={() => navigate('/trial-bookings')}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      {/* 基本信息 */}
      <Card title="预约信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="客户姓名">
            <Space>
              <UserOutlined />
              {detail.name}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="手机号">
            <Space>
              <PhoneOutlined />
              <a href={`tel:${detail.phone}`}>{detail.phone || '-'}</a>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="预约课程">
            {detail.course?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="期望试听日期">
            {detail.preferDate ? (
              <Space>
                <CalendarOutlined />
                {dayjs(detail.preferDate).format('YYYY-MM-DD')}
              </Space>
            ) : (
              <span style={{ color: '#ccc' }}>未指定</span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="当前状态">
            <Tag color={st.color}>{st.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="注册用户">
            {detail.user ? (
              <Tag color="blue">{detail.user.nickname || '已注册'}</Tag>
            ) : (
              <span style={{ color: '#ccc' }}>未注册</span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="预约时间">
            {dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="备注">
            {detail.remark || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 状态操作 */}
      <Card title="状态更新" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <span>更新为：</span>
            <Select
              value={newStatus}
              style={{ width: 160 }}
              onChange={setNewStatus}
              options={Object.entries(statusMap).map(([k, v]) => ({
                label: v.label,
                value: k,
              }))}
            />
            <Button
              type="primary"
              loading={updatingStatus}
              onClick={handleUpdateStatus}
              disabled={newStatus === detail.status}
            >
              确认更新
            </Button>
          </Space>
          <Input.TextArea
            placeholder="备注信息（可选）"
            rows={2}
            value={statusRemark}
            onChange={(e) => setStatusRemark(e.target.value)}
            style={{ maxWidth: 500 }}
          />
        </Space>
      </Card>

      {/* 客户跟进 */}
      <Card title="客户跟进">
        {/* 添加跟进 */}
        <div style={{ marginBottom: 24 }}>
          <Input.TextArea
            placeholder="请输入跟进内容，如：已电话联系客户，确认周六下午2点到店试听..."
            rows={3}
            value={followContent}
            onChange={(e) => setFollowContent(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <Button
            type="primary"
            loading={addingFollow}
            onClick={handleAddFollowUp}
          >
            添加跟进记录
          </Button>
        </div>

        <Divider />

        {/* 跟进时间线 */}
        {detail.followUps && detail.followUps.length > 0 ? (
          <Timeline
            items={detail.followUps.map((f) => ({
              color: 'blue',
              dot: <ClockCircleOutlined />,
              children: (
                <div key={f.id}>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>
                      {f.admin?.nickname || '管理员'}
                    </span>
                    <span style={{ color: '#999', marginLeft: 12, fontSize: 13 }}>
                      {dayjs(f.createdAt).format('YYYY-MM-DD HH:mm')}
                    </span>
                  </div>
                  <div style={{ color: '#555', lineHeight: 1.6 }}>{f.content}</div>
                </div>
              ),
            }))}
          />
        ) : (
          <div style={{ color: '#ccc', textAlign: 'center', padding: 40 }}>
            暂无跟进记录
          </div>
        )}
      </Card>
    </div>
  );
}
