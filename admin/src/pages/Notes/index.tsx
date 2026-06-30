import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Input,
  Select,
  Space,
  Avatar,
  Tag,
  Popconfirm,
  Button,
  Modal,
  Image,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  UserOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  LikeOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAdminNotes, deleteAdminNote, type Note } from '../../services/note';
import { getCourses, type Course } from '../../services/course';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const resolveUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function Notes() {
  const [data, setData] = useState<Note[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState<{
    page: number;
    pageSize: number;
    courseId?: string;
    keyword?: string;
  }>({ page: 1, pageSize: 10 });
  const [previewNote, setPreviewNote] = useState<Note | null>(null);

  useEffect(() => {
    getCourses({ pageSize: 200 }).then((res) => setCourses(res.items || []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminNotes(query);
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await deleteAdminNote(id);
      message.success('删除成功');
      load();
    } catch {
      message.error('删除失败');
    }
  };

  const columns: ColumnsType<Note> = [
    {
      title: '作者',
      key: 'author',
      width: 140,
      render: (_: unknown, r: Note) => (
        <Space>
          <Avatar
            size={28}
            src={resolveUrl(r.student?.user?.avatar) || undefined}
            icon={!r.student?.user?.avatar ? <UserOutlined /> : undefined}
          />
          <span>{r.student?.user?.nickname || '-'}</span>
        </Space>
      ),
    },
    {
      title: '内容预览',
      key: 'content',
      ellipsis: true,
      render: (_: unknown, r: Note) => (
        <Space
          style={{ cursor: 'pointer' }}
          onClick={() => setPreviewNote(r)}
        >
          <span style={{ color: '#1677ff' }}>{r.content?.slice(0, 60) || '-'}{r.content?.length > 60 ? '...' : ''}</span>
          {r.images && r.images.length > 0 && (
            <Tag icon={<PictureOutlined />} color="blue">{r.images.length}</Tag>
          )}
          {r.videoUrl && <Tag icon={<VideoCameraOutlined />} color="purple">视频</Tag>}
        </Space>
      ),
    },
    {
      title: '关联课程',
      key: 'course',
      width: 140,
      render: (_: unknown, r: Note) => r.course?.name || '-',
    },
    {
      title: '关联班级',
      key: 'classGroup',
      width: 120,
      render: (_: unknown, r: Note) => r.classGroup?.name || '-',
    },
    {
      title: '互动',
      key: 'stats',
      width: 120,
      render: (_: unknown, r: Note) => (
        <Space>
          <span><LikeOutlined /> {r.likes}</span>
          <span><MessageOutlined /> {r.comments}</span>
        </Space>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, r: Note) => (
        <Popconfirm title="确定删除该笔记？" onConfirm={() => handleDelete(r.id)}>
          <Button type="link" size="small" danger>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card title="笔记管理">
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="全部课程"
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: 200 }}
          onChange={(v) => setQuery((q) => ({ ...q, courseId: v, page: 1 }))}
          options={courses.map((c) => ({ label: c.name, value: c.id }))}
        />
        <Input.Search
          placeholder="搜索笔记内容"
          allowClear
          style={{ width: 200 }}
          onSearch={(v) => setQuery((q) => ({ ...q, keyword: v || undefined, page: 1 }))}
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (page, pageSize) => setQuery((q) => ({ ...q, page, pageSize })),
        }}
      />

      {/* 笔记预览弹窗 */}
      <Modal
        title="笔记详情"
        open={!!previewNote}
        onCancel={() => setPreviewNote(null)}
        footer={null}
        width={640}
      >
        {previewNote && (
          <div>
            {/* 作者信息 */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
              <Avatar
                size={36}
                src={resolveUrl(previewNote.student?.user?.avatar) || undefined}
                icon={!previewNote.student?.user?.avatar ? <UserOutlined /> : undefined}
              />
              <div>
                <div style={{ fontWeight: 500 }}>{previewNote.student?.user?.nickname || '-'}</div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {previewNote.course?.name || ''}
                  {previewNote.classGroup ? ` · ${previewNote.classGroup.name}` : ''}
                </div>
              </div>
            </div>

            {/* 文字内容 */}
            <div style={{ whiteSpace: 'pre-wrap', marginBottom: 16, lineHeight: 1.8 }}>
              {previewNote.content || '-'}
            </div>

            {/* 图片 */}
            {previewNote.images && previewNote.images.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Image.PreviewGroup>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {previewNote.images.map((img: string, idx: number) => (
                      <Image
                        key={idx}
                        src={resolveUrl(img)}
                        width={120}
                        height={120}
                        style={{ objectFit: 'cover', borderRadius: 8 }}
                      />
                    ))}
                  </div>
                </Image.PreviewGroup>
              </div>
            )}

            {/* 视频 */}
            {previewNote.videoUrl && (
              <div style={{ marginBottom: 16 }}>
                <video
                  src={resolveUrl(previewNote.videoUrl)}
                  controls
                  style={{ width: '100%', maxHeight: 360, borderRadius: 8 }}
                />
              </div>
            )}

            {/* 互动数据 */}
            <div style={{ color: '#999', fontSize: 13, display: 'flex', gap: 16 }}>
              <span><LikeOutlined /> {previewNote.likes}</span>
              <span><MessageOutlined /> {previewNote.comments}</span>
              <span style={{ marginLeft: 'auto' }}>
                {previewNote.createdAt ? new Date(previewNote.createdAt).toLocaleString('zh-CN') : ''}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
