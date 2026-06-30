import { useEffect, useState, useCallback } from 'react';
import {
  Table, Tag, Input, Select, Button, Space, message, Popconfirm, Card, Typography,
} from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getOrders, confirmPaid, cancelOrder, type Order } from '../../services/order';
import dayjs from 'dayjs';

const { Option } = Select;

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待付款', color: 'orange' },
  paid: { text: '已付款', color: 'green' },
  cancelled: { text: '已取消', color: 'default' },
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOrders({ page, pageSize, status, keyword: keyword || undefined });
      setOrders(res.items || []);
      setTotal(res.total || 0);
    } catch {
      message.error('加载订单失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, keyword]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const handleReset = () => {
    setStatus(undefined);
    setKeyword('');
    setPage(1);
  };

  const handleConfirmPaid = async (id: string) => {
    try {
      await confirmPaid(id);
      message.success('已确认收款');
      fetchOrders();
    } catch {
      message.error('操作失败');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelOrder(id);
      message.success('已取消订单');
      fetchOrders();
    } catch {
      message.error('操作失败');
    }
  };

  const columns: ColumnsType<Order> = [
    {
      title: '订单号',
      dataIndex: 'id',
      width: 120,
      render: (id: string) => (
        <Typography.Text copyable={{ text: id }} style={{ fontSize: 12 }}>
          {id.slice(0, 8)}...
        </Typography.Text>
      ),
    },
    {
      title: '课程名称',
      dataIndex: ['course', 'name'],
      width: 180,
      ellipsis: true,
    },
    {
      title: '学员',
      width: 160,
      render: (_: unknown, record: Order) => {
        const user = record.student?.user;
        if (!user) return '-';
        return (
          <span>
            {user.nickname || '未设置'}
            <br />
            <span style={{ color: '#999', fontSize: 12 }}>{user.phone || '-'}</span>
          </span>
        );
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 100,
      render: (val: string) => <span style={{ color: '#e74c3c', fontWeight: 600 }}>¥{val}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => {
        const info = statusMap[s] || { text: s, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '分班状态',
      dataIndex: 'classGroupStatus',
      width: 100,
      render: (s: string) => {
        if (s === '已分班') return <Tag color="green">已分班</Tag>;
        if (s === '未分班') return <Tag color="orange">未分班</Tag>;
        return '-';
      },
    },
    {
      title: '下单时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '付款时间',
      dataIndex: 'paidAt',
      width: 170,
      render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      width: 140,
      fixed: 'right',
      render: (_: unknown, record: Order) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Popconfirm title="确认该订单已线下收款？" onConfirm={() => handleConfirmPaid(record.id)}>
                <Button type="link" size="small">确认收款</Button>
              </Popconfirm>
              <Popconfirm title="确定取消该订单？" onConfirm={() => handleCancel(record.id)}>
                <Button type="link" size="small" danger>取消</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>订单管理</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="订单状态"
            allowClear
            style={{ width: 140 }}
            value={status}
            onChange={setStatus}
          >
            <Option value="pending">待付款</Option>
            <Option value="paid">已付款</Option>
            <Option value="cancelled">已取消</Option>
          </Select>
          <Input
            placeholder="学员手机号 / 课程名"
            allowClear
            style={{ width: 220 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={orders}
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </div>
  );
}
