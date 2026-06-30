import { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Popconfirm,
  Modal,
  Form,
  Input,
  InputNumber,
  Checkbox,
  message,
  TimePicker,
  Select,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  getClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  updateClassroomStatus,
  type Classroom,
} from '../../services/venue';
import dayjs from 'dayjs';

const RESOURCE_OPTIONS = [
  '投影仪',
  '空调',
  '风扇',
  '饮水机',
  '桌椅',
  '白板',
  '音响',
  '钢琴',
];

const WEEKDAYS = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
];

interface Props {
  venueId: string;
}

export default function ClassroomManager({ venueId }: Props) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getClassrooms(venueId);
      setClassrooms(data);
    } catch {
      message.error('加载教室失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [venueId]);

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: Classroom) => {
    setEditingId(record.id);
    const ts = Array.isArray(record.timeSlots) ? record.timeSlots : [];
    form.setFieldsValue({
      name: record.name,
      capacity: record.capacity,
      resources: Array.isArray(record.resources) ? record.resources : [],
      timeSlots: ts.map((s: any) => ({
        weekday: s.weekday,
        startTime: s.startTime ? dayjs(s.startTime, 'HH:mm') : null,
        endTime: s.endTime ? dayjs(s.endTime, 'HH:mm') : null,
      })),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const timeSlots = (values.timeSlots || []).map((s: any) => ({
        weekday: s.weekday,
        startTime: s.startTime ? s.startTime.format('HH:mm') : null,
        endTime: s.endTime ? s.endTime.format('HH:mm') : null,
      }));
      const payload = {
        name: values.name,
        capacity: values.capacity,
        resources: values.resources || [],
        timeSlots,
      };
      if (editingId) {
        await updateClassroom(editingId, payload);
        message.success('更新成功');
      } else {
        await createClassroom(venueId, payload);
        message.success('创建成功');
      }
      setModalOpen(false);
      load();
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteClassroom(id);
      message.success('删除成功');
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '删除失败');
    }
  };

  const handleStatusToggle = async (record: Classroom) => {
    const newStatus = record.status === 'active' ? 'maintenance' : 'active';
    try {
      await updateClassroomStatus(record.id, newStatus);
      message.success('操作成功');
      load();
    } catch {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: '教室名称', dataIndex: 'name', width: 140 },
    { title: '容纳人数', dataIndex: 'capacity', width: 90 },
    {
      title: '配置资源',
      dataIndex: 'resources',
      width: 220,
      render: (v: string[] | null) =>
        Array.isArray(v) && v.length > 0
          ? v.map((r) => (
              <Tag key={r} color="blue">
                {r}
              </Tag>
            ))
          : '-',
    },
    {
      title: '可用时间段',
      dataIndex: 'timeSlots',
      width: 220,
      render: (v: any[] | null) =>
        Array.isArray(v) && v.length > 0
          ? v.map((s, i) => {
              const wd = WEEKDAYS.find((d) => d.value === s.weekday);
              return (
                <Tag key={i}>
                  {wd?.label || `D${s.weekday}`} {s.startTime}-{s.endTime}
                </Tag>
              );
            })
          : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) =>
        v === 'active' ? (
          <Tag color="green">启用</Tag>
        ) : (
          <Tag color="orange">维护中</Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, r: Classroom) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleStatusToggle(r)}
          >
            {r.status === 'active' ? '维护' : '启用'}
          </Button>
          <Popconfirm
            title="确定删除该教室？"
            onConfirm={() => handleDelete(r.id)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建教室
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={classrooms}
        columns={columns}
        pagination={false}
        size="small"
      />

      <Modal
        title={editingId ? '编辑教室' : '新建教室'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="教室名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="如：舞蹈室A" />
          </Form.Item>
          <Form.Item
            label="容纳人数"
            name="capacity"
            rules={[{ required: true, message: '请输入容纳人数' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="配置资源" name="resources">
            <Checkbox.Group options={RESOURCE_OPTIONS} />
          </Form.Item>
          <Form.List name="timeSlots">
            {(fields, { add, remove }) => (
              <>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>
                  可用时间段
                </div>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ marginBottom: 8 }}>
                    <Form.Item {...restField} name={[name, 'weekday']} noStyle>
                      <Select
                        placeholder="星期"
                        options={WEEKDAYS}
                        style={{ width: 90 }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'startTime']}
                      noStyle
                    >
                      <TimePicker format="HH:mm" placeholder="开始" />
                    </Form.Item>
                    <span>-</span>
                    <Form.Item
                      {...restField}
                      name={[name, 'endTime']}
                      noStyle
                    >
                      <TimePicker format="HH:mm" placeholder="结束" />
                    </Form.Item>
                    <Button
                      type="link"
                      danger
                      size="small"
                      onClick={() => remove(name)}
                    >
                      删除
                    </Button>
                  </Space>
                ))}
                <Button type="dashed" block onClick={() => add()}>
                  + 添加时间段
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
