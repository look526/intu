import { useEffect, useState, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Space, message, Typography, Descriptions, Modal, Popconfirm,
  Select, Form, Input, InputNumber, DatePicker, Alert,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, ScheduleOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import {
  getClassGroup, updateClassGroup, addStudentsToClassGroup,
  removeStudentFromClassGroup, getUnassignedStudents, changeClassGroupStatus,
  type ClassGroupDetail as ClassGroupDetailType,
  type ClassGroupStudent, type UnassignedStudent,
} from '../../services/classGroup';
import dayjs from 'dayjs';

const { Option } = Select;

const statusMap: Record<string, { text: string; color: string }> = {
  forming: { text: '组建中', color: 'blue' },
  scheduled: { text: '已排课', color: 'cyan' },
  active: { text: '开课中', color: 'green' },
  completed: { text: '已结业', color: 'default' },
};

export default function ClassGroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ClassGroupDetailType | null>(null);
  const [loading, setLoading] = useState(false);

  // 编辑弹窗
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // 添加学员弹窗
  const [addOpen, setAddOpen] = useState(false);
  const [unassigned, setUnassigned] = useState<UnassignedStudent[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [addLoading, setAddLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getClassGroup(id);
      setDetail(data);
    } catch {
      message.error('加载班级详情失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const isForming = detail?.status === 'forming';

  // ==================== 状态变更 ====================

  const statusActions: Record<string, { label: string; target: string; type: 'primary' | 'default'; danger?: boolean }> = {
    forming: { label: '完成排课', target: 'scheduled', type: 'primary' },
    scheduled: { label: '开学', target: 'active', type: 'primary' },
    active: { label: '结业', target: 'completed', type: 'default' },
  };

  const currentAction = detail ? statusActions[detail.status] : undefined;

  const handleChangeStatus = async () => {
    if (!currentAction || !id) return;
    try {
      await changeClassGroupStatus(id, currentAction.target);
      message.success(`已变更为「${statusMap[currentAction.target]?.text}」`);
      fetchDetail();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '状态变更失败');
    }
  };

  // ==================== 编辑班级 ====================

  const handleEdit = () => {
    if (!detail) return;
    editForm.setFieldsValue({
      name: detail.name,
      maxStudents: detail.maxStudents,
      status: detail.status,
      startDate: detail.startDate ? dayjs(detail.startDate) : null,
      endDate: detail.endDate ? dayjs(detail.endDate) : null,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await editForm.validateFields();
      const newStatus = values.status;
      const oldStatus = detail?.status;

      // 状态变更为已开班时，二次确认
      if (newStatus === 'active' && oldStatus !== 'active') {
        Modal.confirm({
          title: '确认开班',
          content: '状态变更为已开班后将自动通知所有班级学员，是否确认？',
          onOk: () => doSave(values),
        });
        return;
      }
      await doSave(values);
    } catch {
      // validation
    }
  };

  const doSave = async (values: any) => {
    try {
      setSaving(true);
      await updateClassGroup(id!, {
        ...values,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : undefined,
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : undefined,
      });
      message.success('班级信息已更新');
      setEditOpen(false);
      fetchDetail();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // ==================== 添加学员 ====================

  const handleOpenAdd = async () => {
    if (!detail) return;
    setAddLoading(true);
    try {
      const list = await getUnassignedStudents(detail.courseId);
      setUnassigned(list);
      setSelectedStudentIds([]);
      setAddOpen(true);
    } catch {
      message.error('加载待分班学员失败');
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddStudents = async () => {
    if (selectedStudentIds.length === 0) {
      message.warning('请选择学员');
      return;
    }
    setAddLoading(true);
    try {
      await addStudentsToClassGroup(id!, selectedStudentIds);
      message.success(`成功添加 ${selectedStudentIds.length} 名学员`);
      setAddOpen(false);
      fetchDetail();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '添加失败');
    } finally {
      setAddLoading(false);
    }
  };

  // ==================== 移除学员 ====================

  const handleRemove = async (studentId: string) => {
    try {
      await removeStudentFromClassGroup(id!, studentId);
      message.success('已移除学员');
      fetchDetail();
    } catch {
      message.error('移除失败');
    }
  };

  // ==================== 学员表格 ====================

  const studentColumns: ColumnsType<ClassGroupStudent> = [
    {
      title: '昵称',
      width: 150,
      render: (_: unknown, record: ClassGroupStudent) =>
        record.student?.user?.nickname || '未设置',
    },
    {
      title: '手机号',
      width: 140,
      render: (_: unknown, record: ClassGroupStudent) =>
        record.student?.user?.phone || '-',
    },
    {
      title: '加入时间',
      dataIndex: 'enrolledAt',
      width: 160,
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm'),
    },
    ...(isForming
      ? [
          {
            title: '操作',
            width: 80,
            render: (_: unknown, record: ClassGroupStudent) => (
              <Popconfirm
                title="确认移除该学员？"
                onConfirm={() => handleRemove(record.studentId)}
              >
                <Button type="link" danger size="small">移除</Button>
              </Popconfirm>
            ),
          } as any,
        ]
      : []),
  ];

  // ==================== 待分班学员表格 ====================

  const unassignedColumns: ColumnsType<UnassignedStudent> = [
    {
      title: '昵称',
      width: 150,
      render: (_: unknown, record: UnassignedStudent) =>
        record.user?.nickname || '未设置',
    },
    {
      title: '手机号',
      width: 140,
      render: (_: unknown, record: UnassignedStudent) =>
        record.user?.phone || '-',
    },
  ];

  if (!detail && !loading) {
    return <Typography.Text type="secondary">班级不存在</Typography.Text>;
  }

  const statusInfo = statusMap[detail?.status || ''] || { text: detail?.status, color: 'default' };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/class-groups')}>返回</Button>
        <Typography.Title level={4} style={{ margin: 0 }}>班级详情</Typography.Title>
      </Space>

      <Card
        loading={loading}
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            {detail?.status === 'forming' && (
              <Button
                icon={<ScheduleOutlined />}
                onClick={() => navigate(`/schedules?classGroupId=${id}`)}
              >
                去排课
              </Button>
            )}
            {currentAction && (
              <Popconfirm
                title={`确认将班级状态变更为「${statusMap[currentAction.target]?.text}」？`}
                onConfirm={handleChangeStatus}
              >
                <Button type={currentAction.type}>{currentAction.label}</Button>
              </Popconfirm>
            )}
            <Button icon={<EditOutlined />} onClick={handleEdit}>编辑</Button>
          </Space>
        }
      >
        <Descriptions column={3}>
          <Descriptions.Item label="班级名称">{detail?.name}</Descriptions.Item>
          <Descriptions.Item label="关联课程">{detail?.course?.name}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="学员数">
            {detail?._count?.students ?? 0} / {detail?.maxStudents}
          </Descriptions.Item>
          <Descriptions.Item label="排课数">{detail?._count?.schedules ?? 0}</Descriptions.Item>
          <Descriptions.Item label="排课进度">
            <span style={{
              color: (detail?.scheduledHours ?? 0) >= (detail?.course?.totalHours ?? 0) && (detail?.course?.totalHours ?? 0) > 0
                ? '#52c41a' : '#faad14'
            }}>
              {detail?.scheduledHours ?? 0} / {detail?.course?.totalHours ?? 0} 小时
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="开始日期">
            {detail?.startDate ? dayjs(detail.startDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="结束日期">
            {detail?.endDate ? dayjs(detail.endDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {detail?.createdAt ? dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="学员名单"
        extra={
          isForming && (
            <Button type="primary" icon={<PlusOutlined />} loading={addLoading} onClick={handleOpenAdd}>
              添加学员
            </Button>
          )
        }
      >
        <Table
          rowKey="studentId"
          columns={studentColumns}
          dataSource={detail?.students || []}
          pagination={false}
        />
      </Card>

      {/* 编辑班级弹窗 */}
      <Modal
        title="编辑班级"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="班级名称" rules={[{ required: true, message: '请输入班级名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="maxStudents" label="最大人数">
            <InputNumber min={1} max={200} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select>
              {Object.entries(statusMap).map(([k, v]) => (
                <Option key={k} value={k}>{v.text}</Option>
              ))}
            </Select>
          </Form.Item>
          <Space>
            <Form.Item name="startDate" label="开始日期">
              <DatePicker />
            </Form.Item>
            <Form.Item name="endDate" label="结束日期">
              <DatePicker />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* 添加学员弹窗 */}
      <Modal
        title="添加学员到班级"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={handleAddStudents}
        confirmLoading={addLoading}
        width={600}
      >
        {unassigned.length === 0 ? (
          <Typography.Text type="secondary">暂无待分班学员（所有已付款学员均已分班）</Typography.Text>
        ) : (
          <Table
            rowKey="id"
            columns={unassignedColumns}
            dataSource={unassigned}
            pagination={false}
            size="small"
            rowSelection={{
              selectedRowKeys: selectedStudentIds,
              onChange: (keys) => setSelectedStudentIds(keys as string[]),
            }}
          />
        )}
      </Modal>
    </div>
  );
}
