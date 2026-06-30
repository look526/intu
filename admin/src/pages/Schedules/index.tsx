import { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Tabs,
  Button,
  Select,
  Space,
  Table,
  Tag,
  DatePicker,
  Popconfirm,
  message,
} from 'antd';
import { PlusOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  getSchedules,
  getSchedule,
  cancelSchedule,
  updateScheduleStatus,
} from '../../services/schedule';
import type { Schedule } from '../../services/schedule';
import { getVenues, getClassrooms } from '../../services/venue';
import { getTeacherSimpleList } from '../../services/teacher';
import { getCourses } from '../../services/course';
import { getClassGroups } from '../../services/classGroup';
import ScheduleCalendar, { type TimeSlot } from './ScheduleCalendar';
import ScheduleModal from './ScheduleModal';
import BatchScheduleModal from './BatchScheduleModal';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  scheduled: { label: '已排课', color: 'blue' },
  ongoing: { label: '进行中', color: 'green' },
  completed: { label: '已完成', color: 'default' },
  canceled: { label: '已取消', color: 'red' },
};

export default function Schedules() {
  // 通用状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<Schedule | null>(null);
  const [prefillStart, setPrefillStart] = useState<Date | undefined>();
  const [prefillEnd, setPrefillEnd] = useState<Date | undefined>();

  // 资源选项
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; timeSlots?: TimeSlot[] | null }[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; realName: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);

  // 教室日历筛选
  const [calVenueId, setCalVenueId] = useState<string>();
  const [calClassroomId, setCalClassroomId] = useState<string>();

  // 老师日历筛选
  const [calTeacherId, setCalTeacherId] = useState<string>();

  // 列表筛选
  const [listData, setListData] = useState<Schedule[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [listTeacherId, setListTeacherId] = useState<string>();
  const [listCourseId, setListCourseId] = useState<string>();
  const [listStatus, setListStatus] = useState<string>();
  const [listClassGroupId, setListClassGroupId] = useState<string>();
  const [classGroupsForList, setClassGroupsForList] = useState<{ id: string; name: string }[]>([]);
  const [listDateRange, setListDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [listLoading, setListLoading] = useState(false);

  // 批量排课
  const [batchOpen, setBatchOpen] = useState(false);

  // 用于日历刷新的 key
  const [calendarKey, setCalendarKey] = useState(0);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      const [teacherRes, venueRes, courseRes] = await Promise.all([
        getTeacherSimpleList(),
        getVenues({ status: 'approved', pageSize: 200 }) as any,
        getCourses({ status: 'published', pageSize: 200 }) as any,
      ]);
      setTeachers(teacherRes || []);
      setVenues(((venueRes as any).items || []).map((v: any) => ({ id: v.id, name: v.name })));
      setCourses(((courseRes as any).items || []).map((c: any) => ({ id: c.id, name: c.name })));
    } catch {
      /* ignore */
    }
  };

  const loadClassroomsForVenue = async (venueId: string) => {
    try {
      const data = await getClassrooms(venueId);
      setClassrooms(
        ((data as any) || [])
          .filter((c: any) => c.status === 'active')
          .map((c: any) => ({ id: c.id, name: c.name, timeSlots: c.timeSlots })),
      );
    } catch {
      setClassrooms([]);
    }
  };

  const loadList = useCallback(async (page = 1) => {
    setListLoading(true);
    try {
      const params: any = { page, pageSize: 20 };
      if (listTeacherId) params.teacherId = listTeacherId;
      if (listCourseId) params.courseId = listCourseId;
      if (listClassGroupId) params.classGroupId = listClassGroupId;
      if (listStatus) params.status = listStatus;
      if (listDateRange) {
        params.dateFrom = listDateRange[0].startOf('day').toISOString();
        params.dateTo = listDateRange[1].endOf('day').toISOString();
      }
      const res = await getSchedules(params);
      setListData(res.items);
      setListTotal(res.total);
      setListPage(page);
    } catch {
      /* ignore */
    } finally {
      setListLoading(false);
    }
  }, [listTeacherId, listCourseId, listClassGroupId, listStatus, listDateRange]);

  const handleCalendarSelect = (start: Date, end: Date) => {
    setPrefillStart(start);
    setPrefillEnd(end);
    setEditData(null);
    setModalOpen(true);
  };

  const handleCalendarEventClick = async (scheduleId: string) => {
    try {
      const schedule = await getSchedule(scheduleId);
      setEditData(schedule);
      setPrefillStart(undefined);
      setPrefillEnd(undefined);
      setModalOpen(true);
    } catch {
      message.error('获取排课详情失败');
    }
  };

  const handleModalSuccess = () => {
    setModalOpen(false);
    setEditData(null);
    setPrefillStart(undefined);
    setPrefillEnd(undefined);
    setCalendarKey((k) => k + 1);
    loadList(listPage);
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelSchedule(id);
      message.success('已取消');
      loadList(listPage);
    } catch {
      /* handled by interceptor */
    }
  };

  const handleStatusChange = async (id: string, status: 'ongoing' | 'completed') => {
    try {
      await updateScheduleStatus(id, status);
      message.success('状态已更新');
      loadList(listPage);
    } catch {
      /* handled by interceptor */
    }
  };

  const columns: ColumnsType<Schedule> = [
    {
      title: '课程',
      dataIndex: ['course', 'name'],
      width: 160,
    },
    {
      title: '班级',
      dataIndex: ['classGroup', 'name'],
      width: 120,
      render: (v: any) => v || '-',
    },
    {
      title: '教室',
      render: (_, r) =>
        `${r.classroom?.name || '-'}${r.classroom?.venue ? ` (${r.classroom.venue.name})` : ''}`,
      width: 180,
    },
    {
      title: '老师',
      dataIndex: ['teacher', 'realName'],
      width: 100,
    },
    {
      title: '助教',
      dataIndex: ['assistant', 'nickname'],
      width: 100,
      render: (v) => v || '-',
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      width: 160,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      width: 100,
      render: (v) => dayjs(v).format('HH:mm'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v) => {
        const st = STATUS_MAP[v] || STATUS_MAP.scheduled;
        return <Tag color={st.color}>{st.label}</Tag>;
      },
    },
    {
      title: '操作',
      width: 200,
      render: (_, r) => (
        <Space size={4}>
          {r.status === 'scheduled' && (
            <>
              <a onClick={() => { setEditData(r); setModalOpen(true); }}>编辑</a>
              <Popconfirm title="确定取消此排课？" onConfirm={() => handleCancel(r.id)}>
                <a style={{ color: '#ff4d4f' }}>取消</a>
              </Popconfirm>
              <Popconfirm title="标记为进行中？" onConfirm={() => handleStatusChange(r.id, 'ongoing')}>
                <a>开始</a>
              </Popconfirm>
            </>
          )}
          {r.status === 'ongoing' && (
            <Popconfirm title="标记为已完成？" onConfirm={() => handleStatusChange(r.id, 'completed')}>
              <a>完成</a>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'classroom',
      label: '教室日历',
      children: (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Select
              showSearch
              allowClear
              placeholder="选择场地"
              style={{ width: 200 }}
              optionFilterProp="label"
              options={venues.map((v) => ({ value: v.id, label: v.name }))}
              value={calVenueId}
              onChange={(v) => {
                setCalVenueId(v);
                setCalClassroomId(undefined);
                setClassrooms([]);
                if (v) loadClassroomsForVenue(v);
              }}
            />
            <Select
              allowClear
              placeholder="选择教室"
              style={{ width: 200 }}
              disabled={!calVenueId}
              options={classrooms.map((c) => ({ value: c.id, label: c.name }))}
              value={calClassroomId}
              onChange={setCalClassroomId}
            />
          </Space>
          <ScheduleCalendar
            classroomId={calClassroomId}
            availableSlots={classrooms.find((c) => c.id === calClassroomId)?.timeSlots ?? undefined}
            emptyText="请先选择场地和教室"
            refreshKey={calendarKey}
            onSelect={handleCalendarSelect}
            onEventClick={handleCalendarEventClick}
          />
        </>
      ),
    },
    {
      key: 'teacher',
      label: '老师日历',
      children: (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Select
              showSearch
              allowClear
              placeholder="选择老师"
              style={{ width: 260 }}
              optionFilterProp="label"
              options={teachers.map((t) => ({ value: t.id, label: t.realName }))}
              value={calTeacherId}
              onChange={setCalTeacherId}
            />
          </Space>
          <ScheduleCalendar
            teacherId={calTeacherId}
            emptyText="请先选择老师"
            refreshKey={calendarKey}
            onSelect={handleCalendarSelect}
            onEventClick={handleCalendarEventClick}
          />
        </>
      ),
    },
    {
      key: 'list',
      label: '排课列表',
      children: (
        <>
          <Space wrap style={{ marginBottom: 16 }}>
            <RangePicker
              onChange={(dates) => setListDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            />
            <Select
              showSearch
              allowClear
              placeholder="选择课程"
              style={{ width: 200 }}
              optionFilterProp="label"
              options={courses.map((c) => ({ value: c.id, label: c.name }))}
              onChange={(v) => {
                setListCourseId(v);
                setListClassGroupId(undefined);
                setClassGroupsForList([]);
                if (v) {
                  getClassGroups({ courseId: v, pageSize: 200 }).then((res) => {
                    setClassGroupsForList((res.items || []).map((g: any) => ({ id: g.id, name: g.name })));
                  }).catch(() => {});
                }
              }}
            />
            <Select
              allowClear
              placeholder="选择班级"
              style={{ width: 160 }}
              disabled={classGroupsForList.length === 0}
              options={classGroupsForList.map((g) => ({ value: g.id, label: g.name }))}
              value={listClassGroupId}
              onChange={setListClassGroupId}
            />
            <Select
              showSearch
              allowClear
              placeholder="选择老师"
              style={{ width: 160 }}
              optionFilterProp="label"
              options={teachers.map((t) => ({ value: t.id, label: t.realName }))}
              onChange={setListTeacherId}
            />
            <Select
              allowClear
              placeholder="状态"
              style={{ width: 120 }}
              options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))}
              onChange={setListStatus}
            />
            <Button type="primary" onClick={() => loadList(1)}>
              查询
            </Button>
          </Space>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={listData}
            loading={listLoading}
            pagination={{
              current: listPage,
              pageSize: 20,
              total: listTotal,
              onChange: (p) => loadList(p),
            }}
          />
        </>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          排课管理
        </Title>
        <Space>
          <Button
            icon={<CalendarOutlined />}
            onClick={() => setBatchOpen(true)}
          >
            批量排课
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditData(null);
              setPrefillStart(undefined);
              setPrefillEnd(undefined);
              setModalOpen(true);
            }}
          >
            新建排课
          </Button>
        </Space>
      </div>

      <Tabs
        items={tabItems}
        destroyOnHidden={false}
        onChange={(key) => {
          if (key === 'list') loadList(1);
        }}
      />

      <ScheduleModal
        open={modalOpen}
        editData={editData}
        prefillStart={prefillStart}
        prefillEnd={prefillEnd}
        onClose={() => { setModalOpen(false); setEditData(null); }}
        onSuccess={handleModalSuccess}
      />

      <BatchScheduleModal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        onSuccess={() => {
          setBatchOpen(false);
          setCalendarKey((k) => k + 1);
          loadList(listPage);
        }}
      />
    </div>
  );
}
