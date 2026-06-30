import { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Form,
  Input,
  Upload,
  Table,
  Popconfirm,
  message,
  Rate,
  Image,
  Spin,
  Avatar,
} from 'antd';
import { UploadOutlined, ArrowLeftOutlined, UserOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTeacher,
  updateTeacher,
  updateTrainingStatus,
  type Teacher,
} from '../../services/teacher';
import { uploadFile } from '../../services/course';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const resolveUrl = (url?: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
};

const trainingStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待培训', color: 'default' },
  passed: { text: '已通过', color: 'green' },
  failed: { text: '未通过', color: 'red' },
};

export default function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [form] = Form.useForm();

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getTeacher(id);
      setTeacher(data);
      form.setFieldsValue({
        realName: data.realName,
        bio: data.bio || '',
        specialties: data.specialties || '',
        phone: data.user?.phone || '',
      });
      setAvatarUrl(data.avatarUrl || data.user?.avatar || '');
    } catch {
      message.error('加载教师信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload: any = {
        realName: values.realName,
        bio: values.bio,
        specialties: values.specialties,
        phone: values.phone || undefined,
      };
      if (avatarUrl) payload.avatarUrl = avatarUrl;
      await updateTeacher(id, payload);
      message.success('保存成功');
      setEditing(false);
      load();
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTrainingStatus = async (status: 'passed' | 'failed') => {
    if (!id) return;
    try {
      await updateTrainingStatus(id, status);
      message.success('操作成功');
      load();
    } catch {
      message.error('操作失败');
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const { url } = await uploadFile(file);
      setAvatarUrl(url);
      message.success('头像上传成功');
    } catch {
      message.error('头像上传失败');
    }
  };

  const handleCertUpload = async (file: File) => {
    if (!id || !teacher) return;
    try {
      const { url } = await uploadFile(file);
      const certs = [...(teacher.certificateUrls || []), url];
      await updateTeacher(id, { certificateUrls: certs } as any);
      message.success('上传成功');
      load();
    } catch {
      message.error('上传失败');
    }
  };

  const courseColumns = [
    { title: '课程名称', dataIndex: 'name', width: 200 },
    {
      title: '分类',
      key: 'category',
      width: 100,
      render: (_: any, r: any) => r.category?.name || '-',
    },
    { title: '课时', dataIndex: 'totalHours', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: string) => {
        const map: Record<string, { text: string; color: string }> = {
          draft: { text: '草稿', color: 'default' },
          published: { text: '已上架', color: 'green' },
          offline: { text: '已下架', color: 'red' },
        };
        const m = map[v] || { text: v, color: 'default' };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!teacher) {
    return <Card>教师不存在</Card>;
  }

  const ts = trainingStatusMap[teacher.trainingStatus] || {
    text: teacher.trainingStatus,
    color: 'default',
  };

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        type="link"
        onClick={() => navigate('/teachers')}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      <Card title="教师信息" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          <div style={{ flexShrink: 0 }}>
            {resolveUrl(teacher.avatarUrl || teacher.user?.avatar) ? (
              <Image
                width={80}
                height={80}
                src={resolveUrl(teacher.avatarUrl || teacher.user?.avatar)}
                style={{ borderRadius: '50%', objectFit: 'cover' }}
                preview={false}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  color: '#bbb',
                }}
              >
                <UserOutlined />
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="姓名">{teacher.realName}</Descriptions.Item>
          <Descriptions.Item label="手机号">{teacher.user?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="专长">
            {teacher.specialties
              ? teacher.specialties.split(',').map((s: string) => (
                  <Tag key={s} color="blue">
                    {s}
                  </Tag>
                ))
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="评分">
            <Rate disabled allowHalf value={parseFloat(teacher.rating)} style={{ fontSize: 14 }} />
            <span style={{ marginLeft: 8 }}>{teacher.rating}</span>
          </Descriptions.Item>
          <Descriptions.Item label="简介" span={2}>
            {teacher.bio || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={teacher.status === 'active' ? 'green' : 'red'}>
              {teacher.status === 'active' ? '活跃' : '冻结'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="培训状态">
            <Tag color={ts.color}>{ts.text}</Tag>
            {teacher.trainingDate && (
              <span style={{ marginLeft: 8, color: '#999' }}>
                {new Date(teacher.trainingDate).toLocaleDateString()}
              </span>
            )}
          </Descriptions.Item>
            </Descriptions>
          </div>
        </div>
      </Card>

      <Card
        title="培训管理"
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            <Popconfirm title="确认标记培训通过？" onConfirm={() => handleTrainingStatus('passed')}>
              <Button type="primary" size="small">
                标记通过
              </Button>
            </Popconfirm>
            <Popconfirm title="确认标记培训不通过？" onConfirm={() => handleTrainingStatus('failed')}>
              <Button danger size="small">
                标记不通过
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <p>
          当前培训状态：<Tag color={ts.color}>{ts.text}</Tag>
        </p>
      </Card>

      <Card
        title="编辑档案"
        style={{ marginBottom: 16 }}
        extra={
          editing ? (
            <Space>
              <Button onClick={() => setEditing(false)}>取消</Button>
              <Button type="primary" loading={saving} onClick={handleSave}>
                保存
              </Button>
            </Space>
          ) : (
            <Button type="primary" onClick={() => setEditing(true)}>
              编辑
            </Button>
          )
        }
      >
        <Form form={form} layout="vertical" disabled={!editing}>
          <Form.Item label="教师头像">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Avatar
                size={64}
                src={resolveUrl(avatarUrl)}
                icon={!avatarUrl ? <UserOutlined /> : undefined}
              />
              {editing && (
                <Upload
                  showUploadList={false}
                  beforeUpload={(file) => {
                    handleAvatarUpload(file);
                    return false;
                  }}
                  accept="image/*"
                >
                  <Button icon={<UploadOutlined />} size="small">更换头像</Button>
                </Upload>
              )}
            </div>
          </Form.Item>
          <Form.Item label="姓名" name="realName" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="简介" name="bio">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="专长（逗号分隔）" name="specialties">
            <Input placeholder="音乐,美术,瑜伽" />
          </Form.Item>
          <Form.Item label="手机号" name="phone">
            <Input placeholder="输入手机号" />
          </Form.Item>
        </Form>

        <div style={{ marginTop: 16 }}>
          <h4>证书图片</h4>
          <Space wrap>
            {(teacher.certificateUrls || []).map((url: string, i: number) => {
              const src = url.startsWith('http') ? url : `${API_BASE}${url}`;
              return <Image key={i} width={120} src={src} />;
            })}
          </Space>
          {editing && (
            <Upload
              showUploadList={false}
              beforeUpload={(file) => {
                handleCertUpload(file);
                return false;
              }}
              accept="image/*"
            >
              <Button icon={<UploadOutlined />} style={{ marginTop: 8 }}>
                上传证书
              </Button>
            </Upload>
          )}
        </div>
      </Card>

      <Card title={`关联课程（${teacher.courses?.length || 0}）`}>
        <Table
          rowKey="id"
          dataSource={teacher.courses || []}
          columns={courseColumns}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
