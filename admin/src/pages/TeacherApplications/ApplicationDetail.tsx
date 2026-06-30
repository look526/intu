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
  Divider,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getTeacherApplication,
  auditTeacherApplication,
  type TeacherApplication,
} from '../../services/teacherApplication';

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

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<TeacherApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditRemark, setAuditRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      getTeacherApplication(id)
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
      await auditTeacherApplication(id, {
        status,
        auditRemark: auditRemark.trim() || undefined,
      });
      message.success(status === 'approved' ? '已通过，老师档案已自动创建' : '已驳回');
      if (id) {
        getTeacherApplication(id).then(setApp);
      }
    } catch (e) {
      console.error('audit error', e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Card loading />;
  if (!app) return <Card>申请不存在</Card>;

  const certificates = (app.certificateUrls || []) as string[];
  const portfolios = (app.portfolioUrls || []) as string[];
  const statusInfo = statusMap[app.status] || { text: app.status, color: 'default' };

  return (
    <div>
      <Button
        style={{ marginBottom: 16 }}
        onClick={() => navigate('/teacher-applications')}
      >
        ← 返回列表
      </Button>

      <Card title="申请人信息">
        <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
          {app.avatarUrl && (
            <Image
              src={resolveUrl(app.avatarUrl)}
              width={120}
              height={120}
              style={{ borderRadius: 12, objectFit: 'cover' }}
            />
          )}
          <Descriptions column={2} style={{ flex: 1 }}>
            <Descriptions.Item label="真实姓名">{app.realName}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{app.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="擅长领域">{app.specialties}</Descriptions.Item>
            <Descriptions.Item label="教学年限">{app.teachingYears}年</Descriptions.Item>
            <Descriptions.Item label="申请时间">
              {dayjs(app.createdAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
            </Descriptions.Item>
          </Descriptions>
        </div>

        {app.bio && (
          <>
            <Typography.Title level={5}>个人简介</Typography.Title>
            <Typography.Paragraph>{app.bio}</Typography.Paragraph>
          </>
        )}
      </Card>

      {/* 证书照片 */}
      {certificates.length > 0 && (
        <Card title="资质证书" style={{ marginTop: 16 }}>
          <Image.PreviewGroup>
            <Space wrap>
              {certificates.map((url, i) => (
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

      {/* 作品照片 */}
      {portfolios.length > 0 && (
        <Card title="作品/教学成果" style={{ marginTop: 16 }}>
          <Image.PreviewGroup>
            <Space wrap>
              {portfolios.map((url, i) => (
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

      {/* 视频 */}
      {app.introVideoUrl && (
        <Card title="自我介绍视频" style={{ marginTop: 16 }}>
          <video
            src={resolveUrl(app.introVideoUrl)}
            controls
            style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8 }}
          />
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
              title="确认通过该老师申请？"
              description="通过后将自动创建老师档案"
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
