import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Tag, Select, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getVenueApplications,
  type VenueApplication,
} from '../../services/venueApplication';

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'processing' },
  approved: { text: '已通过', color: 'success' },
  rejected: { text: '已驳回', color: 'error' },
};

export default function VenueApplications() {
  const navigate = useNavigate();
  const [list, setList] = useState<VenueApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<{
    page: number;
    pageSize: number;
    status?: string;
  }>({ page: 1, pageSize: 10 });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVenueApplications(query);
      setList(res.items || []);
      setTotal(res.total || 0);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const columns: ColumnsType<VenueApplication> = [
    {
      title: '场地名称',
      dataIndex: 'name',
      width: 150,
    },
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
      title: '申请人',
      width: 120,
      render: (_: unknown, r: VenueApplication) =>
        r.user?.nickname || '-',
    },
    {
      title: '手机号',
      width: 130,
      render: (_: unknown, r: VenueApplication) =>
        r.user?.phone || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => {
        const m = statusMap[v] || { text: v, color: 'default' };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, r: VenueApplication) => (
        <a onClick={() => navigate(`/venue-applications/${r.id}`)}>详情</a>
      ),
    },
  ];

  return (
    <Card title="场地申请管理">
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="全部状态"
          allowClear
          style={{ width: 140 }}
          onChange={(v) => setQuery((q) => ({ ...q, status: v, page: 1 }))}
          options={Object.entries(statusMap).map(([k, v]) => ({
            label: v.text,
            value: k,
          }))}
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (page, pageSize) =>
            setQuery((q) => ({ ...q, page, pageSize })),
        }}
      />
    </Card>
  );
}
