import { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Image,
  Button,
  Space,
  Input,
  message,
  Popconfirm,
  Typography,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getVenueApplication,
  auditVenueApplication,
  type VenueApplication,
} from '../../services/venueApplication';

const { TextArea } = Input;

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function resolveUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'processing' },
  approved: { text: '已通过', color: 'success' },
  rejected: { text: '已驳回', color: 'error' },
};

export default function VenueApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<VenueApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditRemark, setAuditRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      getVenueApplication(id)
        .then(setApp)
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleAudit = async (status: 'approved' | 'rejected') => {
    if (!id) return;
    if (status === 'rejected' && !auditRemark.trim()) {
      message.warning('请填写驳回原因');
      return;
    }
    setSubmitting(true);
    try {
      await auditVenueApplication(id, {
        status,
        auditRemark: auditRemark.trim() || undefined,
      });
      message.success(
        status === 'approved'
          ? '已通过，场地记录已自动创建（待线下考察）'
          : '已驳回',
      );
      if (id) {
        getVenueApplication(id).then(setApp);
      }
    } catch (e) {
      console.error('audit error', e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Card loading />;
  if (!app) return <Card>申请不存在</Card>;

  const photos = (app.photos || []) as string[];
  const statusInfo = statusMap[app.status] || { text: app.status, color: 'default' };

  return (
    <div>
      <Button
        style={{ marginBottom: 16 }}
        onClick={() => navigate('/venue-applications')}
      >
        ← 返回列表
      </Button>

      <Card title="场地申请信息">
        <Descriptions column={2}>
          <Descriptions.Item label="场地名称">{app.name}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="地址" span={2}>{app.address}</Descriptions.Item>
          <Descriptions.Item label="面积(m²)">{app.area ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="经纬度">
            {app.latitude}, {app.longitude}
          </Descriptions.Item>
          <Descriptions.Item label="申请人">
            {app.user?.nickname || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="手机号">
            {app.user?.phone || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="申请时间">
            {dayjs(app.createdAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
        </Descriptions>

        {app.trafficInfo && (
          <>
            <Typography.Title level={5} style={{ marginTop: 16 }}>
              交通信息
            </Typography.Title>
            <Typography.Paragraph>{app.trafficInfo}</Typography.Paragraph>
          </>
        )}
      </Card>

      {/* 场地照片 */}
      {photos.length > 0 && (
        <Card title="场地照片" style={{ marginTop: 16 }}>
          <Image.PreviewGroup>
            <Space wrap>
              {photos.map((url, i) => (
                <Image
                  key={i}
                  src={resolveUrl(url)}
                  width={160}
                  height={160}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                />
              ))}
            </Space>
          </Image.PreviewGroup>
        </Card>
      )}

      {/* 审核操作 */}
      {app.status === 'pending' && (
        <Card title="审核操作" style={{ marginTop: 16 }}>
          <TextArea
            rows={3}
            placeholder="备注 / 驳回原因（驳回时必填）"
            value={auditRemark}
            onChange={(e) => setAuditRemark(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Space>
            <Popconfirm
              title="确认通过该场地申请？"
              description="通过后将自动创建场地记录（初始状态为待线下考察）"
              onConfirm={() => handleAudit('approved')}
            >
              <Button type="primary" loading={submitting}>
                通过
              </Button>
            </Popconfirm>
            <Button
              danger
              loading={submitting}
              onClick={() => handleAudit('rejected')}
            >
              驳回
            </Button>
          </Space>
        </Card>
      )}

      {/* 已审核状态显示备注 */}
      {app.status !== 'pending' && app.auditRemark && (
        <Card title="审核备注" style={{ marginTop: 16 }}>
          <Typography.Paragraph>{app.auditRemark}</Typography.Paragraph>
        </Card>
      )}
    </div>
  );
}
