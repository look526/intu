import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  message,
} from 'antd';
import { PlusOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  sortCategories,
  type CourseCategory,
} from '../../services/courseCategory';

export default function CourseCategoryPage() {
  const [list, setList] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CourseCategory | null>(null);
  const [form] = Form.useForm();

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setList(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ priority: list.length + 1 });
    setModalOpen(true);
  };

  const handleEdit = (record: CourseCategory) => {
    setEditing(record);
    form.setFieldsValue({ name: record.name, icon: record.icon, priority: record.priority });
    setModalOpen(true);
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updateCategory(editing.id, values);
      message.success('更新成功');
    } else {
      await createCategory(values);
      message.success('创建成功');
    }
    setModalOpen(false);
    fetchList();
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCategory(id);
      message.success('删除成功');
      fetchList();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.data?.message || '删除失败');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newList = [...list];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    const items = newList.map((item, i) => ({ id: item.id, priority: i + 1 }));
    await sortCategories(items);
    message.success('排序已更新');
    fetchList();
  };

  const columns = [
    {
      title: '排序',
      width: 80,
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: '图标',
      dataIndex: 'icon',
      width: 80,
      render: (icon: string | null) => (
        <span style={{ fontSize: 24 }}>{icon || '-'}</span>
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
    },
    {
      title: '关联课程数',
      dataIndex: ['_count', 'courses'],
      width: 120,
    },
    {
      title: '操作',
      width: 240,
      render: (_: unknown, record: CourseCategory, index: number) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<ArrowUpOutlined />}
            disabled={index === 0}
            onClick={() => handleMove(index, 'up')}
          />
          <Button
            type="text"
            size="small"
            icon={<ArrowDownOutlined />}
            disabled={index === list.length - 1}
            onClick={() => handleMove(index, 'down')}
          />
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="课程分类管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增分类
        </Button>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={false}
      />

      <Modal
        title={editing ? '编辑分类' : '新增分类'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder="如：音乐" maxLength={20} />
          </Form.Item>
          <Form.Item name="icon" label="图标（Emoji）">
            <Input placeholder="如：🎵" maxLength={10} />
          </Form.Item>
          <Form.Item name="priority" label="排序（数字越小越靠前）">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
