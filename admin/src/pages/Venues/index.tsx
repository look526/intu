import { useEffect, useState, useCallback, useRef } from 'react';
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
  Modal,
  Form,
  InputNumber,
  Upload,
  Image,
} from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  getVenues,
  createVenue,
  updateVenueStatus,
  type Venue,
} from '../../services/venue';
import { searchUsers, type UserOption } from '../../services/student';
import { uploadFile } from '../../services/course';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const resolveUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '已通过', color: 'green' },
  rejected: { text: '已驳回', color: 'red' },
  offline: { text: '已下线', color: 'default' },
};

export default function Venues() {
  const navigate = useNavigate();
  const [data, setData] = useState<Venue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState<string>();
  const [keyword, setKeyword] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [ownerOptions, setOwnerOptions] = useState<UserOption[]>([]);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVenues({
        page,
        pageSize,
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
  }, [page, pageSize, status, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusToggle = async (record: Venue) => {
    const newStatus = record.status === 'approved' ? 'offline' : 'approved';
    try {
      await updateVenueStatus(record.id, newStatus);
      message.success('操作成功');
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '操作失败');
    }
  };

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    setCreating(true);
    try {
      await createVenue({
        ...values,
        latitude: values.latitude || 0,
        longitude: values.longitude || 0,
        photos: photoUrls,
        ownerId: values.ownerId || undefined,
      });
      message.success('创建成功');
      setCreateOpen(false);
      createForm.resetFields();
      setPhotoUrls([]);
      setOwnerOptions([]);
      load();
    } catch {
      message.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleOwnerSearch = (val: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val || !val.trim()) {
      setOwnerOptions([]);
      return;
    }
    setOwnerSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const users = await searchUsers(val.trim());
        setOwnerOptions(users);
      } catch {
        setOwnerOptions([]);
      } finally {
        setOwnerSearching(false);
      }
    }, 400);
  };

  const handlePhotoUpload = async (file: File) => {
    if (photoUrls.length >= 9) {
      message.warning('最多上传9张照片');
      return false;
    }
    setUploading(true);
    try {
      const res = await uploadFile(file);
      setPhotoUrls((prev) => [...prev, res.url]);
    } catch {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const removePhoto = (idx: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const columns = [
    { title: '场地名称', dataIndex: 'name', width: 150 },
    {
      title: '地址',
      dataIndex: 'address',
      width: 200,
      ellipsis: true,
    },
    {
      title: '面积(m²)',
      dataIndex: 'area',
      width: 90,
      render: (v: number | null) => v ?? '-',
    },
    {
      title: '教室数',
      key: 'classroomCount',
      width: 80,
      render: (_: any, r: Venue) => r._count?.classrooms ?? 0,
    },
    {
      title: '审核状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => {
        const m = statusMap[v] || { text: v, color: 'default' };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: '考察',
      dataIndex: 'isSiteVisited',
      width: 80,
      render: (v: boolean) =>
        v ? (
          <Tag color="green">已考察</Tag>
        ) : (
          <Tag color="default">未考察</Tag>
        ),
    },
    {
      title: '场地主',
      key: 'owner',
      width: 150,
      render: (_: any, r: Venue) => {
        if (!r.owner) return '-';
        const { nickname, phone } = r.owner;
        if (nickname && phone) return `${nickname} (${phone})`;
        return nickname || phone || '-';
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, r: Venue) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/venues/${r.id}`)}
          >
            详情
          </Button>
          {(r.status === 'approved' || r.status === 'offline') && (
            <Popconfirm
              title={
                r.status === 'approved'
                  ? '确定下线该场地？'
                  : '确定上线该场地？'
              }
              onConfirm={() => handleStatusToggle(r)}
            >
              <Button
                type="link"
                size="small"
                danger={r.status === 'approved'}
              >
                {r.status === 'approved' ? '下线' : '上线'}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="场地管理"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          新建场地
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="审核状态"
          allowClear
          style={{ width: 130 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { label: '待审核', value: 'pending' },
            { label: '已通过', value: 'approved' },
            { label: '已驳回', value: 'rejected' },
            { label: '已下线', value: 'offline' },
          ]}
        />
        <Input.Search
          placeholder="搜索场地名称/地址"
          allowClear
          style={{ width: 220 }}
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

      <Modal
        title="新建场地"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          setPhotoUrls([]);
          setOwnerOptions([]);
        }}
        onOk={handleCreate}
        confirmLoading={creating}
        width={640}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            label="场地名称"
            name="name"
            rules={[{ required: true, message: '请输入场地名称' }]}
          >
            <Input placeholder="如：阳光舞蹈室、社区活动中心" />
          </Form.Item>
          <Form.Item
            label="地址"
            name="address"
            rules={[{ required: true, message: '请输入地址' }]}
          >
            <Input placeholder="请输入详细地址" />
          </Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item label="纬度" name="latitude" style={{ width: 200 }}>
              <InputNumber
                placeholder="如 30.2741"
                step={0.0001}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="经度" name="longitude" style={{ width: 200 }}>
              <InputNumber
                placeholder="如 120.1551"
                step={0.0001}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Space>
          <div style={{ fontSize: 12, color: '#999', marginTop: -12, marginBottom: 16 }}>
            可通过高德/百度地图查询经纬度坐标
          </div>
          <Form.Item label="面积(m²)" name="area">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="选填" />
          </Form.Item>
          <Form.Item label="交通信息" name="trafficInfo">
            <Input.TextArea rows={2} placeholder="描述附近的公交、地铁、停车场等交通信息" />
          </Form.Item>

          {/* 场地照片 */}
          <Form.Item label={`场地照片（${photoUrls.length}/9）`}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {photoUrls.map((url, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <Image
                    src={resolveUrl(url)}
                    width={80}
                    height={80}
                    style={{ objectFit: 'cover', borderRadius: 6 }}
                  />
                  <Button
                    type="link"
                    danger
                    size="small"
                    style={{ position: 'absolute', top: -8, right: -8, background: '#fff', borderRadius: '50%', padding: 0, width: 20, height: 20, lineHeight: '20px', fontSize: 12 }}
                    onClick={() => removePhoto(idx)}
                  >
                    ×
                  </Button>
                </div>
              ))}
              {photoUrls.length < 9 && (
                <Upload
                  showUploadList={false}
                  beforeUpload={(file) => {
                    handlePhotoUpload(file);
                    return false;
                  }}
                  accept="image/*"
                >
                  <Button icon={<UploadOutlined />} loading={uploading}>
                    上传照片
                  </Button>
                </Upload>
              )}
            </div>
          </Form.Item>

          {/* 场地主（可选，远程搜索） */}
          <Form.Item label="场地主" name="ownerId" extra="可选，输入手机号或昵称搜索">
            <Select
              showSearch
              allowClear
              placeholder="输入手机号或昵称搜索"
              filterOption={false}
              onSearch={handleOwnerSearch}
              loading={ownerSearching}
              notFoundContent={ownerSearching ? '搜索中...' : '无匹配用户'}
              options={ownerOptions.map((u) => ({
                label: `${u.nickname || '未设置昵称'}${u.phone ? ` (${u.phone})` : ''}`,
                value: u.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
