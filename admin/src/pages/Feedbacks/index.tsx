import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Tag,
  Button,
  Modal,
  Input,
  Image,
  Space,
  Select,
  Typography,
  message,
} from 'antd';
import { EyeOutlined, MessageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getFeedbacks,
  replyFeedback,
  updateFeedbackStatus,
  type Feedback,
} from '../../services/feedback';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const typeMap: Record<string, { label: string; color: string }> = {
  suggestion: { label: '功能建议', color: 'blue' },
  bug: { label: '问题反馈', color: 'red' },
  other: { label: '其他', color: 'default' },
};

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'orange' },
  processing: { label: '处理中', color: 'blue' },
  resolved: { label: '已解决', color: 'green' },
  closed: { label: '已关闭', color: 'default' },
};

export default function Feedbacks() {
  const [data, setData] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [current, setCurrent] = useState<Feedback | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFeedbacks({ page, pageSize, status: statusFilter });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch {
      message.error('获取反馈列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleViewDetail = (record: Feedback) => {
    setCurrent(record);
    setDetailOpen(true);
  };

  const handleOpenReply = (record: Feedback) => {
    setCurrent(record);
    setReplyText(record.reply || '');
    setReplyOpen(true);
  };

  const handleReply = async () => {
    if (!current || !replyText.trim()) {
      message.warning('请输入回复内容');
      return;
    }
    try {
      await replyFeedback(current.id, replyText.trim());
      message.success('回复成功');
      setReplyOpen(false);
      fetchData();
    } catch {
      message.error('回复失败');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateFeedbackStatus(id, status);
      message.success('状态更新成功');
      fetchData();
    } catch {
      message.error('状态更新失败');
    }
  };

  const columns = [
    {
      title: '用户',
      width: 120,
      render: (_: unknown, record: Feedback) => record.user?.nickname || record.userId.slice(0, 8),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (type: string) => {
        const t = typeMap[type] || { label: type, color: 'default' };
        return <Tag color={t.color}>{t.label}</Tag>;
      },
    },
    {
      title: '内容',
      dataIndex: 'content',
      ellipsis: true,
    },
    {
      title: '图片',
      dataIndex: 'images',
      width: 80,
      render: (images: string[]) => images?.length ? `${images.length}张` : '-',
    },
    {
      title: '联系方式',
      dataIndex: 'contact',
      width: 130,
      render: (v: string) => v || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => {
        const s = statusMap[status] || { label: status, color: 'default' };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 260,
      render: (_: unknown, record: Feedback) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          <Button type="link" icon={<MessageOutlined />} onClick={() => handleOpenReply(record)}>
            回复
          </Button>
          <Select
            size="small"
            value={record.status}
            style={{ width: 90 }}
            onChange={(v) => handleStatusChange(record.id, v)}
            options={Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>意见反馈</Typography.Title>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <span>状态筛选：</span>
          <Select
            allowClear
            placeholder="全部"
            style={{ width: 120 }}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </Space>
      </div>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />

      {/* 详情弹窗 */}
      <Modal
        title="反馈详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={<Button onClick={() => setDetailOpen(false)}>关闭</Button>}
        width={600}
      >
        {current && (
          <div>
            <p><strong>用户：</strong>{current.user?.nickname || current.userId}</p>
            <p><strong>类型：</strong>{typeMap[current.type]?.label || current.type}</p>
            <p><strong>联系方式：</strong>{current.contact || '未填写'}</p>
            <p><strong>提交时间：</strong>{dayjs(current.createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
            <p><strong>状态：</strong>{statusMap[current.status]?.label || current.status}</p>
            <p><strong>内容：</strong></p>
            <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, marginBottom: 12 }}>
              {current.content}
            </div>
            {current.images?.length > 0 && (
              <>
                <p><strong>图片：</strong></p>
                <Space wrap>
                  {current.images.map((url, i) => (
                    <Image
                      key={i}
                      src={url.startsWith('http') ? url : `${API_BASE}${url}`}
                      width={120}
                      height={120}
                      style={{ objectFit: 'cover', borderRadius: 6 }}
                    />
                  ))}
                </Space>
              </>
            )}
            {current.reply && (
              <>
                <p style={{ marginTop: 12 }}><strong>回复：</strong></p>
                <div style={{ background: '#e6f7ff', padding: 12, borderRadius: 6 }}>
                  {current.reply}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* 回复弹窗 */}
      <Modal
        title="回复反馈"
        open={replyOpen}
        onOk={handleReply}
        onCancel={() => setReplyOpen(false)}
        okText="提交回复"
      >
        {current && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ color: '#999' }}>用户反馈：{current.content?.slice(0, 100)}</p>
          </div>
        )}
        <Input.TextArea
          rows={4}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="请输入回复内容"
        />
      </Modal>
    </div>
  );
}
