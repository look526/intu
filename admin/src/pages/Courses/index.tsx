import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Select,
  Input,
  Image,
  message,
} from 'antd';
import { PlusOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  getCourses,
  updateCourseStatus,
  toggleRecommend,
  type Course,
} from '../../services/course';
import { getCategories, type CourseCategory } from '../../services/courseCategory';

const statusMap: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  published: { text: '已上架', color: 'green' },
  offline: { text: '已下架', color: 'red' },
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function CourseList() {
  const navigate = useNavigate();
  const [list, setList] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [query, setQuery] = useState<{
    page: number;
    pageSize: number;
    categoryId?: number;
    status?: string;
    keyword?: string;
  }>({ page: 1, pageSize: 10 });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCourses(query);
      setList(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleStatusChange = async (id: string, status: string) => {
    await updateCourseStatus(id, status);
    message.success('状态已更新');
    fetchList();
  };

  const handleToggleRecommend = async (id: string) => {
    await toggleRecommend(id);
    message.success('推荐状态已更新');
    fetchList();
  };

  const columns = [
    {
      title: '封面',
      dataIndex: 'coverImage',
      width: 100,
      render: (url: string | null) =>
        url ? (
          <Image
            src={url.startsWith('http') ? url : `${API_BASE}${url}`}
            width={80}
            height={54}
            style={{ objectFit: 'cover', borderRadius: 6 }}
            preview={false}
          />
        ) : (
          <div style={{ width: 80, height: 54, background: '#f0f0f0', borderRadius: 6 }} />
        ),
    },
    { title: '名称', dataIndex: 'name', width: 200 },
    {
      title: '分类',
      dataIndex: ['category', 'name'],
      width: 100,
    },
    {
      title: '教师',
      dataIndex: ['teacher', 'realName'],
      width: 100,
    },
    { title: '课时', dataIndex: 'totalHours', width: 70 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => {
        const info = statusMap[s] || { text: s, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '推荐',
      dataIndex: 'isRecommended',
      width: 70,
      render: (v: boolean, record: Course) => (
        <Button
          type="text"
          icon={v ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
          onClick={() => handleToggleRecommend(record.id)}
        />
      ),
    },
    {
      title: '操作',
      width: 200,
      render: (_: unknown, record: Course) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/courses/edit/${record.id}`)}>
            编辑
          </Button>
          {record.status === 'draft' && (
            <Button type="link" size="small" onClick={() => handleStatusChange(record.id, 'published')}>
              上架
            </Button>
          )}
          {record.status === 'published' && (
            <Button type="link" size="small" danger onClick={() => handleStatusChange(record.id, 'offline')}>
              下架
            </Button>
          )}
          {record.status === 'offline' && (
            <Button type="link" size="small" onClick={() => handleStatusChange(record.id, 'published')}>
              重新上架
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="课程管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/courses/create')}>
          新建课程
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="全部分类"
          allowClear
          style={{ width: 140 }}
          onChange={(v) => setQuery((q) => ({ ...q, categoryId: v, page: 1 }))}
          options={categories.map((c) => ({ label: c.name, value: c.id }))}
        />
        <Select
          placeholder="全部状态"
          allowClear
          style={{ width: 120 }}
          onChange={(v) => setQuery((q) => ({ ...q, status: v, page: 1 }))}
          options={[
            { label: '草稿', value: 'draft' },
            { label: '已上架', value: 'published' },
            { label: '已下架', value: 'offline' },
          ]}
        />
        <Input.Search
          placeholder="搜索课程名称"
          allowClear
          style={{ width: 200 }}
          onSearch={(v) => setQuery((q) => ({ ...q, keyword: v || undefined, page: 1 }))}
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
          onChange: (page, pageSize) => setQuery((q) => ({ ...q, page, pageSize })),
        }}
      />
    </Card>
  );
}
