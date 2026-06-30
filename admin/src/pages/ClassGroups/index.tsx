import { useEffect, useState, useCallback } from 'react';
import {
  Table, Tag, Input, Select, Button, Space, message, Card, Typography, Drawer, Form, InputNumber, DatePicker, Alert,
} from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import {
  getClassGroups, createClassGroup, getUnassignedStudents,
  type ClassGroup, type UnassignedStudent,
} from '../../services/classGroup';
import { getCourses, type Course } from '../../services/course';
import dayjs from 'dayjs';

const { Option } = Select;

const statusMap: Record<string, { text: string; color: string }> = {
  forming: { text: '组建中', color: 'blue' },
  scheduled: { text: '已排课', color: 'cyan' },
  active: { text: '开课中', color: 'green' },
  completed: { text: '已结业', color: 'default' },
};

export default function ClassGroups() {
  const navigate = useNavigate();
  const [list, setList] = useState<ClassGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [courseId, setCourseId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const [unassigned, setUnassigned] = useState<UnassignedStudent[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>();

  useEffect(() => {
    getCourses({ pageSize: 200 }).then((res) => setCourses(res.items || []));
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getClassGroups({ page, pageSize, courseId, status, keyword: keyword || undefined });
      setList(res.items || []);
      setTotal(res.total || 0);
    } catch {
      message.error('加载班级列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, courseId, status, keyword]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSearch = () => { setPage(1); fetchList(); };
  const handleReset = () => { setCourseId(undefined); setStatus(undefined); setKeyword(''); setPage(1); };

  const handleCourseChange = async (cId: string) => {
    setSelectedCourseId(cId);
    setUnassigned([]);
    setSelectedStudentIds([]);
    if (!cId) return;
    setLoadingStudents(true);
    try {
      const list = await getUnassignedStudents(cId);
      setUnassigned(list);
      // 默认选择前 maxStudents 个（按下单时间最早的）
      const max = form.getFieldValue('maxStudents') || 30;
      setSelectedStudentIds(list.slice(0, max).map((s) => s.id));
    } catch {
      message.error('加载待分班学员失败');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      await createClassGroup({
        ...values,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : undefined,
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : undefined,
        studentIds: selectedStudentIds.length > 0 ? selectedStudentIds : undefined,
      });
      message.success('班级创建成功');
      setDrawerOpen(false);
      form.resetFields();
      setUnassigned([]);
      setSelectedStudentIds([]);
      setSelectedCourseId(undefined);
      fetchList();
    } catch {
      // validation or API error
    } finally {
      setCreating(false);
    }
  };

  const columns: ColumnsType<ClassGroup> = [
    { title: '班级名称', dataIndex: 'name', width: 180 },
    {
      title: '关联课程',
      dataIndex: ['course', 'name'],
      width: 180,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => {
        const m = statusMap[s] || { text: s, color: 'default' };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: '学员数',
      width: 100,
      render: (_: unknown, record: ClassGroup) =>
        `${record._count?.students ?? 0} / ${record.maxStudents}`,
    },
    {
      title: '排课数',
      width: 80,
      render: (_: unknown, record: ClassGroup) => record._count?.schedules ?? 0,
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      width: 120,
      render: (d: string | null) => (d ? dayjs(d).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 100,
      render: (_: unknown, record: ClassGroup) => (
        <Button type="link" size="small" onClick={() => navigate(`/class-groups/${record.id}`)}>
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>班级管理</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="选择课程"
            allowClear
            showSearch
            optionFilterProp="children"
            style={{ width: 200 }}
            value={courseId}
            onChange={setCourseId}
          >
            {courses.map((c) => (
              <Option key={c.id} value={c.id}>{c.name}</Option>
            ))}
          </Select>
          <Select
            placeholder="班级状态"
            allowClear
            style={{ width: 140 }}
            value={status}
            onChange={setStatus}
          >
            {Object.entries(statusMap).map(([k, v]) => (
              <Option key={k} value={k}>{v.text}</Option>
            ))}
          </Select>
          <Input
            placeholder="班级名称 / 课程名"
            allowClear
            style={{ width: 200 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>创建班级</Button>
        </Space>
      </Card>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />

      <Drawer
        title="创建班级"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); form.resetFields(); setUnassigned([]); setSelectedStudentIds([]); setSelectedCourseId(undefined); }}
        styles={{ wrapper: { width: 720 } }}
        extra={
          <Space>
            <Button onClick={() => { setDrawerOpen(false); form.resetFields(); setUnassigned([]); setSelectedStudentIds([]); setSelectedCourseId(undefined); }}>取消</Button>
            <Button type="primary" loading={creating} onClick={handleCreate}>创建</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="courseId" label="关联课程" rules={[{ required: true, message: '请选择课程' }]}>
            <Select
              placeholder="选择课程"
              showSearch
              optionFilterProp="children"
              onChange={handleCourseChange}
            >
              {courses.map((c) => (
                <Option key={c.id} value={c.id}>{c.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="name" label="班级名称" rules={[{ required: true, message: '请输入班级名称' }]}>
            <Input placeholder="如：素描初级班 第1期" />
          </Form.Item>
          <Space size={16}>
            <Form.Item name="maxStudents" label="最大人数" initialValue={30}>
              <InputNumber min={1} max={200} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="startDate" label="开班时间">
              <DatePicker />
            </Form.Item>
            <Form.Item name="endDate" label="结束时间">
              <DatePicker />
            </Form.Item>
            <Form.Item name="status" label="班级状态" initialValue="forming">
              <Select style={{ width: 120 }}>
                <Option value="forming">待开班</Option>
                <Option value="active">已开班</Option>
                <Option value="completed">已结业</Option>
              </Select>
            </Form.Item>
          </Space>

          {/* 待分班学员列表 */}
          <div style={{ marginTop: 8 }}>
            <Typography.Text strong>关联学员</Typography.Text>
            {unassigned.length > 0 && (
              <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                共 {unassigned.length} 名待分班学员，已选 {selectedStudentIds.length} 名
              </Typography.Text>
            )}
          </div>
          {!selectedCourseId && !loadingStudents && (
            <Alert title="请先选择课程，将自动加载该课程的待分班学员" type="info" showIcon style={{ margin: '8px 0' }} />
          )}
          {unassigned.length === 0 && selectedCourseId && !loadingStudents && (
            <Alert title="该课程暂无待分班学员（所有已付款学员均已分班）" type="warning" showIcon style={{ margin: '8px 0' }} />
          )}
          {unassigned.length > 0 && (
            <Table
              rowKey="id"
              size="small"
              loading={loadingStudents}
              dataSource={unassigned}
              pagination={false}
              scroll={{ y: 300 }}
              style={{ marginTop: 8 }}
              rowSelection={{
                selectedRowKeys: selectedStudentIds,
                onChange: (keys) => setSelectedStudentIds(keys as string[]),
              }}
              columns={[
                {
                  title: '昵称',
                  width: 120,
                  render: (_: unknown, r: UnassignedStudent) => r.user?.nickname || '未设置',
                },
                {
                  title: '手机号',
                  width: 130,
                  render: (_: unknown, r: UnassignedStudent) => r.user?.phone || '-',
                },
                {
                  title: '下单时间',
                  width: 160,
                  render: (_: unknown, r: UnassignedStudent) =>
                    r.order?.createdAt ? dayjs(r.order.createdAt).format('YYYY-MM-DD HH:mm') : '-',
                },
                {
                  title: '订单金额',
                  width: 100,
                  render: (_: unknown, r: UnassignedStudent) =>
                    r.order?.amount ? `¥${r.order.amount}` : '-',
                },
              ]}
            />
          )}
        </Form>
      </Drawer>
    </div>
  );
}
