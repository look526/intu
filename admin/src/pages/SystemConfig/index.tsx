import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  ColorPicker,
  Space,
  Image,
  Upload,
  Switch,
  Radio,
  Tag,
  message,
  Popconfirm,
  Typography,
} from 'antd';
import { LinkOutlined, GlobalOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { DatePicker, Select, InputNumber, Checkbox } from 'antd';
import dayjs from 'dayjs';
import { getConfig, updateConfig } from '../../services/systemConfig';
import { uploadFile } from '../../services/course';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import '@wangeditor/editor/dist/css/style.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface BannerItem {
  imageUrl: string;
  title: string;
  linkType: 'miniprogram' | 'h5';
  linkUrl: string;
}

interface QuickLinkItem {
  name: string;
  icon: string;
  iconUrl: string;
  color: string;
  linkUrl: string;
  status: 'published' | 'offline';
}

// ==================== Banner 管理 ====================

function BannerTab() {
  const [data, setData] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkType, setLinkType] = useState<'miniprogram' | 'h5'>('miniprogram');
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getConfig('banners');
      setData(Array.isArray(res) ? res : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveData = async (newData: BannerItem[]) => {
    await updateConfig('banners', newData);
    setData(newData);
    message.success('保存成功');
  };

  const handleAdd = () => {
    setEditIndex(null);
    setImageUrl(null);
    setLinkType('miniprogram');
    form.resetFields();
    form.setFieldsValue({ linkType: 'miniprogram' });
    setModalOpen(true);
  };

  const handleEdit = (index: number) => {
    setEditIndex(index);
    const item = data[index];
    setImageUrl(item.imageUrl || null);
    setLinkType(item.linkType || 'miniprogram');
    form.setFieldsValue({ title: item.title, linkType: item.linkType || 'miniprogram', linkUrl: item.linkUrl });
    setModalOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadFile(file);
      setImageUrl(res.url);
      message.success('上传成功');
    } catch {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleDelete = async (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    await saveData(newData);
  };

  const handleModalOk = async () => {
    if (!imageUrl) {
      message.error('请上传 Banner 图片');
      return;
    }
    const values = await form.validateFields();
    const item: BannerItem = { ...values, linkType: linkType, imageUrl };
    const newData = [...data];
    if (editIndex !== null) {
      newData[editIndex] = item;
    } else {
      newData.push(item);
    }
    await saveData(newData);
    setModalOpen(false);
  };

  const columns = [
    {
      title: '图片预览',
      dataIndex: 'imageUrl',
      width: 120,
      render: (url: string) => (
        <Image src={url.startsWith('http') ? url : `${API_BASE}${url}`} width={80} height={34} style={{ objectFit: 'cover', borderRadius: 4 }} fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAwMBAQApDs4AAAAASUVORK5CYII=" />
      ),
    },
    { title: '标题', dataIndex: 'title' },
    {
      title: '链接类型',
      dataIndex: 'linkType',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'h5' ? 'blue' : 'green'} icon={type === 'h5' ? <GlobalOutlined /> : <LinkOutlined />}>
          {type === 'h5' ? 'H5网页' : '内部链接'}
        </Tag>
      ),
    },
    { title: '链接', dataIndex: 'linkUrl', ellipsis: true },
    {
      title: '操作',
      width: 150,
      render: (_: unknown, __: unknown, index: number) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(index)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(index)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加 Banner</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey={(_, i) => String(i)} loading={loading} pagination={false} />
      <Modal title={editIndex !== null ? '编辑 Banner' : '添加 Banner'} open={modalOpen} onOk={handleModalOk} onCancel={() => setModalOpen(false)} destroyOnHidden>
        <Form form={form} layout="vertical">
          <Form.Item label="Banner 图片" required>
            <Space orientation="vertical">
              {imageUrl && (
                <Image
                  src={imageUrl.startsWith('http') ? imageUrl : `${API_BASE}${imageUrl}`}
                  width={320}
                  height={120}
                  style={{ objectFit: 'cover', borderRadius: 6 }}
                />
              )}
              <Upload
                showUploadList={false}
                accept="image/*"
                beforeUpload={(file) => handleUpload(file as unknown as File)}
              >
                <Button icon={<UploadOutlined />} loading={uploading}>
                  {imageUrl ? '更换图片' : '上传图片'}
                </Button>
              </Upload>
            </Space>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="linkType" label="链接类型">
            <Radio.Group value={linkType} onChange={(e) => { setLinkType(e.target.value); form.setFieldValue('linkUrl', ''); }}>
              <Radio value="miniprogram">小程序内部链接</Radio>
              <Radio value="h5">H5 网页链接</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="linkUrl" label="跳转链接">
            <Input placeholder={linkType === 'h5' ? 'https://example.com/page' : '/pages/course/detail/index?id=1'} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ==================== 运营弹窗管理 ====================

interface PopupItem {
  id: string;
  name: string;
  imageUrl: string;
  linkType: 'miniprogram' | 'h5' | 'none';
  linkUrl: string;
  targetPages: string[];
  frequency: { type: 'once' | 'daily' | 'weekly' | 'monthly'; limit: number };
  status: 'published' | 'offline';
  startTime: string;
  endTime: string;
}

const PAGE_OPTIONS = [
  { label: '首页', value: '/pages/index/index' },
  { label: '选课', value: '/pages/course/list/index' },
  { label: '学习', value: '/pages/study/index' },
  { label: '我的', value: '/pages/mine/index' },
  { label: '课程详情', value: '/pages/course/detail/index' },
  { label: '笔记详情', value: '/pages/note/detail/index' },
  { label: '教师详情', value: '/pages/teacher/detail/index' },
];

function PopupTab() {
  const [data, setData] = useState<PopupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkType, setLinkType] = useState<'miniprogram' | 'h5' | 'none'>('none');
  const [freqType, setFreqType] = useState<string>('once');
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getConfig('popups');
      setData(Array.isArray(res) ? res : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveData = async (newData: PopupItem[]) => {
    await updateConfig('popups', newData);
    setData(newData);
    message.success('保存成功');
  };

  const handleAdd = () => {
    setEditIndex(null);
    setImageUrl(null);
    setLinkType('none');
    setFreqType('once');
    form.resetFields();
    form.setFieldsValue({ linkType: 'none', freqType: 'once', freqLimit: 1, status: 'published', targetPages: ['/pages/index/index'] });
    setModalOpen(true);
  };

  const handleEdit = (index: number) => {
    setEditIndex(index);
    const item = data[index];
    setImageUrl(item.imageUrl || null);
    setLinkType(item.linkType || 'none');
    setFreqType(item.frequency?.type || 'once');
    form.setFieldsValue({
      name: item.name,
      linkType: item.linkType || 'none',
      linkUrl: item.linkUrl,
      targetPages: item.targetPages || [],
      freqType: item.frequency?.type || 'once',
      freqLimit: item.frequency?.limit || 1,
      status: item.status || 'published',
      dateRange: item.startTime && item.endTime ? [dayjs(item.startTime), dayjs(item.endTime)] : undefined,
    });
    setModalOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadFile(file);
      setImageUrl(res.url);
      message.success('上传成功');
    } catch {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleDelete = async (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    await saveData(newData);
  };

  const handleToggleStatus = async (index: number) => {
    const newData = [...data];
    newData[index] = { ...newData[index], status: newData[index].status === 'published' ? 'offline' : 'published' };
    await saveData(newData);
  };

  const handleModalOk = async () => {
    if (!imageUrl) {
      message.error('请上传弹窗图片');
      return;
    }
    // linkType 为 none 时清除 linkUrl 校验
    if (linkType === 'none') {
      form.setFieldValue('linkUrl', '');
    }
    const values = await form.validateFields();
    const item: PopupItem = {
      id: editIndex !== null ? data[editIndex].id : `pop_${Date.now()}`,
      name: values.name,
      imageUrl,
      linkType,
      linkUrl: linkType === 'none' ? '' : (values.linkUrl || ''),
      targetPages: values.targetPages || [],
      frequency: { type: values.freqType || 'once', limit: values.freqLimit || 1 },
      status: values.status || 'published',
      startTime: values.dateRange?.[0]?.format('YYYY-MM-DD') || '',
      endTime: values.dateRange?.[1]?.format('YYYY-MM-DD') || '',
    };
    const newData = [...data];
    if (editIndex !== null) {
      newData[editIndex] = item;
    } else {
      newData.push(item);
    }
    await saveData(newData);
    setModalOpen(false);
  };

  const freqLabel = (f: PopupItem['frequency']) => {
    if (!f) return '-';
    switch (f.type) {
      case 'once': return '仅一次';
      case 'daily': return `每日 ${f.limit} 次`;
      case 'weekly': return `每周 ${f.limit} 次`;
      case 'monthly': return `每月 ${f.limit} 次`;
      default: return '-';
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', width: 140 },
    {
      title: '弹窗图片',
      dataIndex: 'imageUrl',
      width: 100,
      render: (url: string) => (
        <Image src={url?.startsWith('http') ? url : `${API_BASE}${url}`} width={60} height={80} style={{ objectFit: 'cover', borderRadius: 4 }} fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAwMBAQApDs4AAAAASUVORK5CYII=" />
      ),
    },
    {
      title: '展示页面',
      dataIndex: 'targetPages',
      width: 160,
      render: (pages: string[]) => (pages || []).map(p => {
        const opt = PAGE_OPTIONS.find(o => o.value === p);
        return opt?.label || p;
      }).join('、'),
    },
    {
      title: '频率',
      width: 100,
      render: (_: unknown, record: PopupItem) => freqLabel(record.frequency),
    },
    {
      title: '有效期',
      width: 180,
      render: (_: unknown, record: PopupItem) => {
        if (!record.startTime && !record.endTime) return <Tag>永久</Tag>;
        return `${record.startTime || '?'} ~ ${record.endTime || '?'}`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === 'published' ? 'green' : 'default'}>{status === 'published' ? '上架' : '下架'}</Tag>
      ),
    },
    {
      title: '操作',
      width: 220,
      render: (_: unknown, __: PopupItem, index: number) => (
        <Space>
          <Switch size="small" checked={data[index]?.status === 'published'} onChange={() => handleToggleStatus(index)} checkedChildren="上架" unCheckedChildren="下架" />
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(index)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(index)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加弹窗</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} />
      <Modal title={editIndex !== null ? '编辑弹窗' : '添加弹窗'} open={modalOpen} onOk={handleModalOk} onCancel={() => setModalOpen(false)} destroyOnHidden width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="弹窗名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：春季招生活动" />
          </Form.Item>
          <Form.Item label="弹窗图片" required>
            <Space orientation="vertical">
              {imageUrl && (
                <Image
                  src={imageUrl.startsWith('http') ? imageUrl : `${API_BASE}${imageUrl}`}
                  width={240}
                  height={320}
                  style={{ objectFit: 'cover', borderRadius: 6 }}
                />
              )}
              <Upload
                showUploadList={false}
                accept="image/*"
                beforeUpload={(file) => handleUpload(file as unknown as File)}
              >
                <Button icon={<UploadOutlined />} loading={uploading}>
                  {imageUrl ? '更换图片' : '上传图片'}
                </Button>
              </Upload>
            </Space>
          </Form.Item>
          <Form.Item name="linkType" label="点击事件">
            <Radio.Group value={linkType} onChange={(e) => { setLinkType(e.target.value); form.setFieldValue('linkUrl', ''); }}>
              <Radio value="none">无跳转</Radio>
              <Radio value="miniprogram">小程序内部链接</Radio>
              <Radio value="h5">H5 网页链接</Radio>
            </Radio.Group>
          </Form.Item>
          {linkType !== 'none' && (
            <Form.Item name="linkUrl" label="跳转链接" rules={[{ required: true, message: '请输入链接' }]}>
              <Input placeholder={linkType === 'h5' ? 'https://example.com/page' : '/pages/course/detail/index?id=1'} />
            </Form.Item>
          )}
          <Form.Item name="targetPages" label="展示页面" rules={[{ required: true, message: '请选择至少一个页面' }]}>
            <Checkbox.Group options={PAGE_OPTIONS} />
          </Form.Item>
          <Form.Item label="弹窗频率" required>
            <Space>
              <Form.Item name="freqType" noStyle>
                <Select style={{ width: 120 }} value={freqType} onChange={(v) => setFreqType(v)} options={[
                  { value: 'once', label: '仅一次' },
                  { value: 'daily', label: '每日' },
                  { value: 'weekly', label: '每周' },
                  { value: 'monthly', label: '每月' },
                ]} />
              </Form.Item>
              {freqType !== 'once' && (
                <Form.Item name="freqLimit" noStyle>
                  <InputNumber min={1} max={99} suffix="次" style={{ width: 120 }} />
                </Form.Item>
              )}
            </Space>
          </Form.Item>
          <Form.Item name="dateRange" label="有效期（可选）">
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked" getValueFromEvent={(checked: boolean) => checked ? 'published' : 'offline'} getValueProps={(value: string) => ({ checked: value === 'published' })}>
            <Switch checkedChildren="上架" unCheckedChildren="下架" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ==================== 金刚区管理 ====================

function QuickLinkTab() {
  const [data, setData] = useState<QuickLinkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [iconType, setIconType] = useState<'text' | 'image'>('text');
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getConfig('home_quick_links');
      setData(Array.isArray(res) ? res : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveData = async (newData: QuickLinkItem[]) => {
    await updateConfig('home_quick_links', newData);
    setData(newData);
    message.success('保存成功');
  };

  const handleAdd = () => {
    setEditIndex(null);
    setIconType('text');
    setIconUrl(null);
    form.resetFields();
    form.setFieldsValue({ color: '#4A90D9', status: 'published' });
    setModalOpen(true);
  };

  const handleEdit = (index: number) => {
    setEditIndex(index);
    const item = data[index];
    const type = item.iconUrl ? 'image' : 'text';
    setIconType(type);
    setIconUrl(item.iconUrl || null);
    form.setFieldsValue({ name: item.name, icon: item.icon, color: item.color, linkUrl: item.linkUrl, status: item.status });
    setModalOpen(true);
  };

  const handleIconUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadFile(file);
      setIconUrl(res.url);
      message.success('上传成功');
    } catch {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newData = [...data];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newData.length) return;
    [newData[index], newData[targetIndex]] = [newData[targetIndex], newData[index]];
    await saveData(newData);
  };

  const handleToggleStatus = async (index: number) => {
    const newData = [...data];
    newData[index] = { ...newData[index], status: newData[index].status === 'published' ? 'offline' : 'published' };
    await saveData(newData);
  };

  const handleDelete = async (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    await saveData(newData);
  };

  const handleModalOk = async () => {
    const values = await form.validateFields();
    if (typeof values.color === 'object' && values.color?.toHexString) {
      values.color = values.color.toHexString();
    }
    if (iconType === 'image' && !iconUrl) {
      message.error('请上传图标图片');
      return;
    }
    if (iconType === 'text' && !values.icon) {
      message.error('请输入文字图标');
      return;
    }
    const item: QuickLinkItem = {
      name: values.name,
      icon: iconType === 'text' ? values.icon : '',
      iconUrl: iconType === 'image' ? (iconUrl || '') : '',
      color: values.color || '#4A90D9',
      linkUrl: values.linkUrl,
      status: values.status || 'published',
    };
    const newData = [...data];
    if (editIndex !== null) {
      newData[editIndex] = item;
    } else {
      newData.push(item);
    }
    await saveData(newData);
    setModalOpen(false);
  };

  const columns = [
    {
      title: '排序',
      width: 90,
      render: (_: unknown, __: unknown, index: number) => (
        <Space orientation="vertical" size={0}>
          <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => handleMove(index, 'up')} />
          <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={index === data.length - 1} onClick={() => handleMove(index, 'down')} />
        </Space>
      ),
    },
    {
      title: '图标',
      width: 80,
      render: (_: unknown, record: QuickLinkItem) => (
        record.iconUrl ? (
          <Image src={record.iconUrl.startsWith('http') ? record.iconUrl : `${API_BASE}${record.iconUrl}`} width={40} height={40} style={{ borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: record.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
            {record.icon}
          </div>
        )
      ),
    },
    { title: '名称', dataIndex: 'name' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === 'published' ? 'green' : 'default'}>{status === 'published' ? '上架' : '下架'}</Tag>
      ),
    },
    { title: '链接', dataIndex: 'linkUrl', ellipsis: true },
    {
      title: '操作',
      width: 220,
      render: (_: unknown, __: QuickLinkItem, index: number) => (
        <Space>
          <Switch size="small" checked={data[index]?.status === 'published'} onChange={() => handleToggleStatus(index)} checkedChildren="上架" unCheckedChildren="下架" />
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(index)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(index)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加金刚区项</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey={(_, i) => String(i)} loading={loading} pagination={false} />
      <Modal title={editIndex !== null ? '编辑金刚区' : '添加金刚区'} open={modalOpen} onOk={handleModalOk} onCancel={() => setModalOpen(false)} destroyOnHidden>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：养生" />
          </Form.Item>
          <Form.Item label="图标类型" required>
            <Radio.Group value={iconType} onChange={(e) => setIconType(e.target.value)}>
              <Radio value="text">文字图标</Radio>
              <Radio value="image">图片图标</Radio>
            </Radio.Group>
          </Form.Item>
          {iconType === 'text' ? (
            <>
              <Form.Item name="icon" label="图标（单字）">
                <Input placeholder="如：养" maxLength={1} style={{ width: 80 }} />
              </Form.Item>
              <Form.Item name="color" label="背景颜色">
                <ColorPicker />
              </Form.Item>
            </>
          ) : (
            <Form.Item label="图标图片" required>
              <Space orientation="vertical">
                {iconUrl && (
                  <Image
                    src={iconUrl.startsWith('http') ? iconUrl : `${API_BASE}${iconUrl}`}
                    width={80}
                    height={80}
                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}
                <Upload
                  showUploadList={false}
                  accept="image/*,.gif"
                  beforeUpload={(file) => handleIconUpload(file as unknown as File)}
                >
                  <Button icon={<UploadOutlined />} loading={uploading}>
                    {iconUrl ? '更换图片' : '上传图片'}
                  </Button>
                </Upload>
              </Space>
            </Form.Item>
          )}
          <Form.Item name="linkUrl" label="跳转链接" rules={[{ required: true, message: '请输入链接' }]}>
            <Input placeholder="/pages/course/list/index?category=xxx" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ==================== 关于我们（富文本编辑器） ====================

function AboutUsTab() {
  const [editor, setEditor] = useState<IDomEditor | null>(null);
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getConfig('about_us');
      const val = typeof res === 'string' ? res : (res?.content || '');
      setHtml(val);
    } catch {
      setHtml('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 组件销毁时销毁编辑器
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
        setEditor(null);
      }
    };
  }, [editor]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfig('about_us', html);
      message.success('保存成功');
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const toolbarConfig: Partial<IToolbarConfig> = useMemo(() => ({
    excludeKeys: ['uploadVideo', 'insertVideo'],
  }), []);

  const editorConfig: Partial<IEditorConfig> = useMemo(() => ({
    placeholder: '请输入关于我们的内容...',
    MENU_CONF: {
      uploadImage: {
        server: `${API_BASE}/upload`,
        maxFileSize: 10 * 1024 * 1024,
        fieldName: 'file',
        customUpload(file: File, insertFn: (url: string, alt: string, href: string) => void) {
          uploadFile(file).then((res) => {
            const url = res.url.startsWith('http') ? res.url : `${API_BASE}${res.url}`;
            insertFn(url, '', '');
          }).catch(() => {
            message.error('图片上传失败');
          });
        },
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // 手动上传图片（备用按钮）
  const handleManualUpload = async (file: File) => {
    try {
      const res = await uploadFile(file);
      const url = res.url.startsWith('http') ? res.url : `${API_BASE}${res.url}`;
      if (editor) {
        editor.dangerouslyInsertHtml(`<img src="${url}" style="max-width:100%;" />`);
      }
      message.success('图片已插入');
    } catch {
      message.error('图片上传失败');
    }
    return false;
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Upload
            showUploadList={false}
            accept="image/*"
            beforeUpload={(file) => handleManualUpload(file as unknown as File)}
          >
            <Button icon={<UploadOutlined />}>插入图片</Button>
          </Upload>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>工具栏图片按钮需先点击编辑区域获取焦点</Typography.Text>
        </Space>
        <Button type="primary" onClick={handleSave} loading={saving}>保存</Button>
      </div>
      <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
        <Toolbar
          editor={editor}
          defaultConfig={toolbarConfig}
          mode="default"
          style={{ borderBottom: '1px solid #d9d9d9' }}
        />
        <Editor
          defaultConfig={editorConfig}
          value={html}
          onCreated={setEditor}
          onChange={(e) => setHtml(e.getHtml())}
          mode="default"
          style={{ height: 500, overflowY: 'hidden' }}
        />
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export default function SystemConfig() {
  return (
    <div>
      <Typography.Title level={3}>系统配置</Typography.Title>
      <Tabs
        defaultActiveKey="banners"
        items={[
          { key: 'banners', label: 'Banner 管理', children: <BannerTab /> },
          { key: 'quick_links', label: '金刚区管理', children: <QuickLinkTab /> },
          { key: 'popups', label: '运营弹窗', children: <PopupTab /> },
          { key: 'about_us', label: '关于我们', children: <AboutUsTab /> },
        ]}
      />
    </div>
  );
}
