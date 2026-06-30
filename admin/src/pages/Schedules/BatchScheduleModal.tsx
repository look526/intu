import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  TimePicker,
  Button,
  Steps,
  Space,
  Table,
  Tag,
  Alert,
  message,
  InputNumber,
  Typography,
  Statistic,
  Row,
  Col,
  Popconfirm,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { getCourses } from '../../services/course';
import { getTeacherSimpleList } from '../../services/teacher';
import { getVenues, getClassrooms } from '../../services/venue';
import { getClassGroups } from '../../services/classGroup';
import {
  batchPreview,
  batchCreateSchedule,
  getClassroomOccupied,
  type BatchRule,
  type BatchPreviewResult,
  type BatchPreviewItem,
  type BatchCreateParams,
  type OccupiedSlot,
} from '../../services/schedule';

const { Text } = Typography;

const WEEKDAY_LABELS: Record<number, string> = {
  1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 0: '周日',
};

// 2026 年中国法定节假日（示例数据，可按需扩充）
const CHINA_HOLIDAYS_2026 = new Set([
  '2026-01-01', '2026-01-02', '2026-01-03', // 元旦
  '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23', // 春节
  '2026-04-05', '2026-04-06', '2026-04-07', // 清明
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', // 劳动节
  '2026-05-31', '2026-06-01', '2026-06-02', // 端午
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', // 国庆+中秋
]);

interface BatchScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BatchScheduleModal({
  open,
  onClose,
  onSuccess,
}: BatchScheduleModalProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Step 1: 基本信息
  const [form] = Form.useForm();
  const [courses, setCourses] = useState<{ id: string; name: string; totalHours: number }[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; userId: string; realName: string }[]>([]);
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; capacity: number; timeSlots: any[] }[]>([]);
  const [classGroupOptions, setClassGroupOptions] = useState<{ id: string; name: string }[]>([]);
  const [selectedCourseHours, setSelectedCourseHours] = useState(0);
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>();
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | undefined>();

  // Step 2: 排课规则
  const [rules, setRules] = useState<(BatchRule & { key: number })[]>([]);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [hoursPerLesson, setHoursPerLesson] = useState(2);
  const [skipHolidays, setSkipHolidays] = useState(true);
  const [skipDates, setSkipDates] = useState<string[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlot[]>([]);

  // Step 3: 预览
  const [preview, setPreview] = useState<BatchPreviewResult | null>(null);

  // 教室可用时间段
  const selectedClassroom = classrooms.find((c) => c.id === selectedClassroomId);
  const selectedTimeSlots: { weekday: number; startTime: string; endTime: string }[] = selectedClassroom?.timeSlots || [];

  useEffect(() => {
    if (open) {
      loadOptions();
    }
    return () => {
      setStep(0);
      setRules([]);
      setStartDate(null);
      setHoursPerLesson(2);
      setSkipHolidays(true);
      setSkipDates([]);
      setPreview(null);
      setClassrooms([]);
      setClassGroupOptions([]);
      setSelectedCourseHours(0);
      setSelectedCourseId(undefined);
      setSelectedClassroomId(undefined);
      setOccupiedSlots([]);
    };
  }, [open]);

  const loadOptions = async () => {
    try {
      const [courseRes, teacherRes, venueRes] = await Promise.all([
        getCourses({ status: 'published', pageSize: 200 }),
        getTeacherSimpleList(),
        getVenues({ status: 'approved', pageSize: 200 }) as any,
      ]);
      setCourses(
        ((courseRes as any).items || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          totalHours: c.totalHours || 0,
        })),
      );
      setTeachers(teacherRes || []);
      setVenues(
        ((venueRes as any).items || []).map((v: any) => ({ id: v.id, name: v.name })),
      );
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
          .map((c: any) => ({ id: c.id, name: c.name, capacity: c.capacity, timeSlots: c.timeSlots || [] })),
      );
    } catch {
      setClassrooms([]);
    }
  };

  const loadClassGroupsForCourse = async (courseId: string) => {
    try {
      const res = await getClassGroups({ courseId, pageSize: 200 });
      setClassGroupOptions(
        (res.items || []).map((g: any) => ({ id: g.id, name: g.name })),
      );
    } catch {
      setClassGroupOptions([]);
    }
  };

  const loadOccupied = async (classroomId: string, dateFrom: string) => {
    try {
      const data = await getClassroomOccupied(classroomId, dateFrom);
      setOccupiedSlots(data || []);
    } catch {
      setOccupiedSlots([]);
    }
  };

  // 自动排课相关
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoLessonsPerWeek, setAutoLessonsPerWeek] = useState(3);
  const [autoBreakMinutes, setAutoBreakMinutes] = useState(10);

  // 自动排课核心逻辑
  const handleAutoSchedule = () => {
    if (selectedTimeSlots.length === 0) {
      message.warning('教室没有设置可用时间段，无法自动排课');
      return;
    }
    if (hoursPerLesson <= 0) {
      message.warning('请先设置每节课课时');
      return;
    }

    const lessonMin = hoursPerLesson * 60;
    const breakMin = autoBreakMinutes;
    const needed = autoLessonsPerWeek;

    // 按周一到周日排序的可用时段
    const sortedSlots = [...selectedTimeSlots].sort((a, b) => {
      const wa = a.weekday === 0 ? 7 : a.weekday;
      const wb = b.weekday === 0 ? 7 : b.weekday;
      if (wa !== wb) return wa - wb;
      return a.startTime.localeCompare(b.startTime);
    });

    // 尝试在每个时段内放置课程
    const newRules: (BatchRule & { key: number })[] = [];
    let placed = 0;

    for (const slot of sortedSlots) {
      if (placed >= needed) break;

      const [ssh, ssm] = slot.startTime.split(':').map(Number);
      const [seh, sem] = slot.endTime.split(':').map(Number);
      const slotStart = ssh * 60 + ssm;
      const slotEnd = seh * 60 + sem;

      // 计算这个时段能放几节课
      let cursor = slotStart;
      while (placed < needed && cursor + lessonMin <= slotEnd) {
        const endMin = cursor + lessonMin;
        const startH = String(Math.floor(cursor / 60)).padStart(2, '0');
        const startM = String(cursor % 60).padStart(2, '0');
        const endH = String(Math.floor(endMin / 60)).padStart(2, '0');
        const endM = String(endMin % 60).padStart(2, '0');

        newRules.push({
          key: Date.now() + placed,
          weekday: slot.weekday,
          startTime: `${startH}:${startM}`,
          endTime: `${endH}:${endM}`,
        });
        placed++;
        cursor = endMin + breakMin; // 加上课间休息
      }
    }

    if (placed === 0) {
      message.warning('可用时间段不足以安排任何课程');
      return;
    }
    if (placed < needed) {
      message.info(`可用时间只能安排 ${placed} 节/周（需要 ${needed} 节/周）`);
    }

    setRules(newRules);
    setAutoOpen(false);
  };

  // 添加 / 删除 / 更新规则
  const addRule = () => {
    setRules((prev) => [
      ...prev,
      { key: Date.now(), weekday: 1, startTime: '09:00', endTime: '11:00' },
    ]);
  };

  const removeRule = (key: number) => {
    setRules((prev) => prev.filter((r) => r.key !== key));
  };

  const updateRule = (key: number, field: string, value: any) => {
    setRules((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  };

  // 检查单条规则是否在可用时间段内
  const checkRuleConflict = useCallback(
    (rule: BatchRule): { ok: boolean; hint: string } => {
      if (selectedTimeSlots.length === 0) return { ok: true, hint: '' };
      const [sh, sm] = rule.startTime.split(':').map(Number);
      const [eh, em] = rule.endTime.split(':').map(Number);
      const ruleStart = sh * 60 + sm;
      const ruleEnd = eh * 60 + em;
      if (ruleEnd <= ruleStart) return { ok: false, hint: '结束时间须晚于开始时间' };
      const matched = selectedTimeSlots.some((s) => {
        if (s.weekday !== rule.weekday) return false;
        const [ssh, ssm] = (s.startTime as string).split(':').map(Number);
        const [seh, sem] = (s.endTime as string).split(':').map(Number);
        return ruleStart >= ssh * 60 + ssm && ruleEnd <= seh * 60 + sem;
      });
      if (!matched) {
        const sameDay = selectedTimeSlots.filter((s) => s.weekday === rule.weekday);
        if (sameDay.length === 0) return { ok: false, hint: `${WEEKDAY_LABELS[rule.weekday]}无可用时间` };
        return { ok: false, hint: '不在可用时间范围内' };
      }
      return { ok: true, hint: '' };
    },
    [selectedTimeSlots],
  );

  // 计算所有跳过日期集合（法定节假日 + 自定义）
  const allSkipDates = useMemo(() => {
    const set = new Set(skipDates);
    if (skipHolidays) {
      CHINA_HOLIDAYS_2026.forEach((d) => set.add(d));
    }
    return set;
  }, [skipDates, skipHolidays]);

  // 需要排的总节数
  const totalLessonsNeeded = useMemo(() => {
    if (selectedCourseHours <= 0 || hoursPerLesson <= 0) return 0;
    return Math.ceil(selectedCourseHours / hoursPerLesson);
  }, [selectedCourseHours, hoursPerLesson]);

  // 核心：从开课日期开始按规则往后推，直到排满课时或达到安全上限
  const scheduleEstimate = useMemo(() => {
    if (!startDate || rules.length === 0) {
      return { lessons: 0, hours: 0, endDate: null as string | null, dates: [] as string[] };
    }

    const maxDays = 365; // 安全上限
    let lessons = 0;
    let totalMin = 0;
    const dates: string[] = [];
    let lastDate = '';

    for (let offset = 0; offset < maxDays; offset++) {
      const d = startDate.add(offset, 'day');
      const dateStr = d.format('YYYY-MM-DD');
      if (allSkipDates.has(dateStr)) continue;

      const jsDay = d.day();
      for (const rule of rules) {
        const ruleDay = rule.weekday === 0 ? 0 : rule.weekday;
        if (ruleDay !== jsDay) continue;

        lessons++;
        const [sh, sm] = rule.startTime.split(':').map(Number);
        const [eh, em] = rule.endTime.split(':').map(Number);
        totalMin += (eh * 60 + em) - (sh * 60 + sm);
        dates.push(dateStr);
        lastDate = dateStr;

        // 如果有课时要求且已满足，停止
        if (totalLessonsNeeded > 0 && lessons >= totalLessonsNeeded) {
          break;
        }
      }
      if (totalLessonsNeeded > 0 && lessons >= totalLessonsNeeded) {
        break;
      }
    }

    return {
      lessons,
      hours: Math.round((totalMin / 60) * 10) / 10,
      endDate: lastDate || null,
      dates,
    };
  }, [startDate, rules, allSkipDates, totalLessonsNeeded]);

  // Step 1 -> Step 2
  const goToStep2 = async () => {
    try {
      await form.validateFields();
      if (rules.length === 0) addRule();
      setStep(1);
      // 加载已占用数据
      if (selectedClassroomId) {
        const from = dayjs().format('YYYY-MM-DD');
        loadOccupied(selectedClassroomId, from);
      }
    } catch {
      /* validation failed */
    }
  };

  // Step 2 -> Step 3: 调用预览 API
  const goToStep3 = async () => {
    if (rules.length === 0) {
      message.warning('请至少添加一条排课规则');
      return;
    }
    if (!startDate) {
      message.warning('请选择开课日期');
      return;
    }
    // 校验每条规则
    for (const rule of rules) {
      if (!rule.startTime || !rule.endTime) {
        message.warning('请完善每条规则的开始和结束时间');
        return;
      }
      const [sh, sm] = rule.startTime.split(':').map(Number);
      const [eh, em] = rule.endTime.split(':').map(Number);
      if (eh * 60 + em <= sh * 60 + sm) {
        message.warning(`${WEEKDAY_LABELS[rule.weekday]}的结束时间必须晚于开始时间`);
        return;
      }
    }
    if (!scheduleEstimate.endDate) {
      message.warning('无法计算结课日期，请检查规则设置');
      return;
    }

    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const allSkip = Array.from(allSkipDates);
      const params: BatchCreateParams = {
        courseId: values.courseId,
        classGroupId: values.classGroupId || undefined,
        classroomId: values.classroomId,
        teacherId: values.teacherId,
        assistantId: values.assistantId || undefined,
        rules: rules.map((r) => ({
          weekday: r.weekday,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
        dateFrom: startDate.format('YYYY-MM-DD'),
        dateTo: scheduleEstimate.endDate,
        skipDates: allSkip.length > 0 ? allSkip : undefined,
      };
      const result = await batchPreview(params);
      setPreview(result);
      setStep(2);
    } catch (err: any) {
      message.error(err?.response?.data?.message || '预览失败');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: 确认创建
  const handleBatchCreate = async () => {
    if (!startDate || !scheduleEstimate.endDate) return;
    setCreating(true);
    try {
      const values = form.getFieldsValue();
      const allSkip = Array.from(allSkipDates);
      const params: BatchCreateParams = {
        courseId: values.courseId,
        classGroupId: values.classGroupId || undefined,
        classroomId: values.classroomId,
        teacherId: values.teacherId,
        assistantId: values.assistantId || undefined,
        rules: rules.map((r) => ({
          weekday: r.weekday,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
        dateFrom: startDate.format('YYYY-MM-DD'),
        dateTo: scheduleEstimate.endDate,
        skipDates: allSkip.length > 0 ? allSkip : undefined,
      };
      const result = await batchCreateSchedule(params);
      message.success(
        `批量排课完成！成功创建 ${result.createdCount} 节${result.skippedCount > 0 ? `，跳过 ${result.skippedCount} 节冲突` : ''}`,
      );
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      message.error(msg || '批量创建失败');
    } finally {
      setCreating(false);
    }
  };

  const normalCount = preview ? preview.items.filter((i) => !i.hasConflict).length : 0;
  const conflictCount = preview ? preview.items.filter((i) => i.hasConflict).length : 0;

  const previewColumns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: any, idx: number) => idx + 1,
    },
    {
      title: '日期',
      dataIndex: 'date',
      width: 120,
    },
    {
      title: '星期',
      dataIndex: 'weekday',
      width: 80,
      render: (v: number) => WEEKDAY_LABELS[v] || v,
    },
    {
      title: '时间',
      key: 'time',
      width: 140,
      render: (_: any, r: BatchPreviewItem) => `${r.startTime} - ${r.endTime}`,
    },
    {
      title: '状态',
      key: 'status',
      width: 200,
      render: (_: any, r: BatchPreviewItem) =>
        r.hasConflict ? (
          <Space>
            <Tag color="error" icon={<CloseCircleOutlined />}>冲突</Tag>
            <Text type="danger" style={{ fontSize: 12 }}>
              {r.conflictReasons.join('；')}
            </Text>
          </Space>
        ) : (
          <Tag color="success" icon={<CheckCircleOutlined />}>正常</Tag>
        ),
    },
  ];

  // ========== Render ==========

  const renderStep1 = () => (
    <Form form={form} layout="vertical">
      <Form.Item
        name="courseId"
        label="课程"
        rules={[{ required: true, message: '请选择课程' }]}
      >
        <Select
          showSearch
          placeholder="搜索选择课程"
          optionFilterProp="label"
          options={courses.map((c) => ({
            value: c.id,
            label: `${c.name}（${c.totalHours}课时）`,
          }))}
          onChange={(v) => {
            form.setFieldValue('classGroupId', undefined);
            setClassGroupOptions([]);
            setSelectedCourseId(v);
            const c = courses.find((x) => x.id === v);
            setSelectedCourseHours(c?.totalHours || 0);
            if (v) loadClassGroupsForCourse(v);
          }}
        />
      </Form.Item>

      <Form.Item name="classGroupId" label="班级（可选）">
        <Select
          allowClear
          showSearch
          placeholder="选择班级"
          optionFilterProp="label"
          disabled={!selectedCourseId}
          notFoundContent="该课程暂无班级"
          options={classGroupOptions.map((g) => ({ value: g.id, label: g.name }))}
        />
      </Form.Item>

      <Space size={16} style={{ display: 'flex' }}>
        <Form.Item
          name="venueId"
          label="场地"
          rules={[{ required: true, message: '请选择场地' }]}
          style={{ flex: 1 }}
        >
          <Select
            showSearch
            placeholder="选择场地"
            optionFilterProp="label"
            options={venues.map((v) => ({ value: v.id, label: v.name }))}
            onChange={(v) => {
              form.setFieldValue('classroomId', undefined);
              setSelectedClassroomId(undefined);
              setClassrooms([]);
              if (v) loadClassroomsForVenue(v);
            }}
          />
        </Form.Item>
        <Form.Item
          name="classroomId"
          label="教室"
          rules={[{ required: true, message: '请选择教室' }]}
          style={{ flex: 1 }}
        >
          <Select
            placeholder="先选场地"
            disabled={classrooms.length === 0}
            options={classrooms.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.capacity}人)`,
            }))}
            onChange={(v) => setSelectedClassroomId(v)}
          />
        </Form.Item>
      </Space>

      <Form.Item
        name="teacherId"
        label="老师"
        rules={[{ required: true, message: '请选择老师' }]}
      >
        <Select
          showSearch
          placeholder="搜索选择老师"
          optionFilterProp="label"
          options={teachers.map((t) => ({ value: t.id, label: t.realName }))}
        />
      </Form.Item>

      <Form.Item name="assistantId" label="助教（可选）">
        <Select
          allowClear
          showSearch
          placeholder="搜索选择助教"
          optionFilterProp="label"
          options={teachers.map((t) => ({ value: t.userId, label: t.realName }))}
        />
      </Form.Item>
    </Form>
  );

  const renderStep2 = () => (
    <div>
      {/* 1. 信息面板：教室可用时间 + 已占用时间 */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {selectedTimeSlots.length > 0 && (
          <Col span={occupiedSlots.length > 0 ? 12 : 24}>
            <div
              style={{
                padding: '10px 14px',
                background: '#f0f5ff',
                borderRadius: 6,
                border: '1px solid #d6e4ff',
                height: '100%',
              }}
            >
              <Text strong style={{ fontSize: 13, color: '#1677ff', display: 'block', marginBottom: 6 }}>
                <CalendarOutlined /> 教室可用时间
              </Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                {[1, 2, 3, 4, 5, 6, 0]
                  .map((wd) => {
                    const slots = selectedTimeSlots.filter((s) => s.weekday === wd);
                    if (slots.length === 0) return null;
                    return (
                      <span key={wd} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        <Text strong style={{ fontSize: 12 }}>{WEEKDAY_LABELS[wd]}</Text>{' '}
                        {slots.map((s, i) => (
                          <Tag key={i} color="blue" style={{ marginRight: 2, fontSize: 12 }}>
                            {s.startTime}-{s.endTime}
                          </Tag>
                        ))}
                      </span>
                    );
                  })
                  .filter(Boolean)}
              </div>
            </div>
          </Col>
        )}
        {occupiedSlots.length > 0 && (
          <Col span={selectedTimeSlots.length > 0 ? 12 : 24}>
            <div
              style={{
                padding: '10px 14px',
                background: '#fff7e6',
                borderRadius: 6,
                border: '1px solid #ffd591',
                height: '100%',
                maxHeight: 120,
                overflowY: 'auto',
              }}
            >
              <Text strong style={{ fontSize: 13, color: '#fa8c16', display: 'block', marginBottom: 6 }}>
                <ClockCircleOutlined /> 已有排课（近期）
              </Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px' }}>
                {occupiedSlots.slice(0, 20).map((s) => (
                  <Tag key={s.id} color="orange" style={{ fontSize: 11, marginBottom: 2 }}>
                    {s.date} {WEEKDAY_LABELS[s.weekday]} {s.startTime}-{s.endTime} {s.courseName}
                  </Tag>
                ))}
                {occupiedSlots.length > 20 && (
                  <Text type="secondary" style={{ fontSize: 11 }}>...还有 {occupiedSlots.length - 20} 条</Text>
                )}
              </div>
            </div>
          </Col>
        )}
      </Row>

      {/* 2. 开课日期 */}
      <div style={{ marginBottom: 16 }}>
        <Text strong>开课日期</Text>
        <div style={{ marginTop: 8 }}>
          <DatePicker
            style={{ width: '100%' }}
            value={startDate}
            onChange={(date) => {
              setStartDate(date);
              if (date && selectedClassroomId) {
                loadOccupied(selectedClassroomId, date.format('YYYY-MM-DD'));
              }
            }}
            placeholder="选择开课日期"
          />
        </div>
      </div>

      {/* 3. 课时设置 */}
      <div
        style={{
          marginBottom: 16,
          padding: '10px 14px',
          background: '#fafafa',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Text>课程共</Text>
        <Tag color="processing" style={{ fontSize: 14, padding: '2px 10px' }}>
          {selectedCourseHours || '未设置'}
        </Tag>
        <Text>课时，每节课</Text>
        <InputNumber
          min={0.5}
          max={8}
          step={0.5}
          value={hoursPerLesson}
          onChange={(v) => setHoursPerLesson(v || 2)}
          style={{ width: 80 }}
          size="small"
        />
        <Text>课时</Text>
        {totalLessonsNeeded > 0 && (
          <>
            <Text type="secondary">|</Text>
            <Text>
              需排 <Text strong style={{ color: '#1677ff' }}>{totalLessonsNeeded}</Text> 节课
            </Text>
          </>
        )}
      </div>

      {/* 4. 排课规则 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text strong>每周排课规则</Text>
          <Space size={8}>
            <Button
              type="primary"
              ghost
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => setAutoOpen(true)}
              disabled={selectedTimeSlots.length === 0}
            >
              自动排课
            </Button>
            <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addRule}>
              手动添加
            </Button>
          </Space>
        </div>

        {/* 自动排课设置卡片 */}
        {autoOpen && (
          <div
            style={{
              marginBottom: 12,
              padding: '12px 16px',
              background: '#f0f5ff',
              borderRadius: 8,
              border: '1px solid #d6e4ff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span>
                <Text style={{ fontSize: 13 }}>每周</Text>{' '}
                <InputNumber
                  min={1}
                  max={14}
                  value={autoLessonsPerWeek}
                  onChange={(v) => setAutoLessonsPerWeek(v || 3)}
                  size="small"
                  style={{ width: 60 }}
                />{' '}
                <Text style={{ fontSize: 13 }}>节课</Text>
              </span>
              <span>
                <Text style={{ fontSize: 13 }}>课间休息</Text>{' '}
                <InputNumber
                  min={0}
                  max={60}
                  step={5}
                  value={autoBreakMinutes}
                  onChange={(v) => setAutoBreakMinutes(v ?? 10)}
                  size="small"
                  style={{ width: 60 }}
                />{' '}
                <Text style={{ fontSize: 13 }}>分钟</Text>
              </span>
              <Space size={8}>
                <Button type="primary" size="small" icon={<ThunderboltOutlined />} onClick={handleAutoSchedule}>
                  生成规则
                </Button>
                <Button size="small" onClick={() => setAutoOpen(false)}>
                  取消
                </Button>
              </Space>
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 6, display: 'block' }}>
              将根据教室可用时间和每节 {hoursPerLesson} 课时自动分配，连续课程之间会插入 {autoBreakMinutes} 分钟休息
            </Text>
          </div>
        )}
        {rules.length === 0 && (
          <Alert title="请添加至少一条排课规则" type="info" showIcon style={{ marginBottom: 8 }} />
        )}
        {rules.map((rule) => {
          const check = checkRuleConflict(rule);
          return (
            <div
              key={rule.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
                padding: '8px 12px',
                background: check.ok ? '#fafafa' : '#fff2f0',
                borderRadius: 6,
                border: check.ok ? 'none' : '1px solid #ffccc7',
              }}
            >
              <Select
                style={{ width: 90 }}
                value={rule.weekday}
                onChange={(v) => updateRule(rule.key, 'weekday', v)}
                options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({
                  value: d,
                  label: WEEKDAY_LABELS[d],
                }))}
              />
              <TimePicker
                format="HH:mm"
                minuteStep={15}
                value={rule.startTime ? dayjs(rule.startTime, 'HH:mm') : undefined}
                onChange={(_, timeStr) =>
                  updateRule(rule.key, 'startTime', timeStr as string)
                }
                style={{ width: 100 }}
                placeholder="开始"
              />
              <span>-</span>
              <TimePicker
                format="HH:mm"
                minuteStep={15}
                value={rule.endTime ? dayjs(rule.endTime, 'HH:mm') : undefined}
                onChange={(_, timeStr) =>
                  updateRule(rule.key, 'endTime', timeStr as string)
                }
                style={{ width: 100 }}
                placeholder="结束"
              />
              {!check.ok && (
                <Text type="danger" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{check.hint}</Text>
              )}
              <div style={{ flex: 1 }} />
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => removeRule(rule.key)}
              />
            </div>
          );
        })}
      </div>

      {/* 5. 节假日设置 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Text strong>节假日设置</Text>
          <Switch
            checked={skipHolidays}
            onChange={setSkipHolidays}
            size="small"
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {skipHolidays ? '跳过法定节假日' : '不跳过节假日'}
          </Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
            自定义跳过日期（可选）
          </Text>
          <DatePicker
            multiple
            maxTagCount="responsive"
            style={{ width: '100%' }}
            value={skipDates.map((d) => dayjs(d))}
            onChange={(dates) =>
              setSkipDates((dates || []).map((d: Dayjs) => d.format('YYYY-MM-DD')))
            }
          />
        </div>
      </div>

      {/* 6. 结课信息面板 */}
      {startDate && rules.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: scheduleEstimate.endDate ? '#f6ffed' : '#fff2f0',
            border: `1px solid ${scheduleEstimate.endDate ? '#b7eb8f' : '#ffccc7'}`,
          }}
        >
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space size={24}>
                <span>
                  <Text type="secondary" style={{ fontSize: 12 }}>预计结课</Text>
                  <br />
                  <Text strong style={{ fontSize: 16 }}>
                    {scheduleEstimate.endDate || '--'}
                  </Text>
                </span>
                <span>
                  <Text type="secondary" style={{ fontSize: 12 }}>排课节数</Text>
                  <br />
                  <Text strong style={{ fontSize: 16 }}>
                    {scheduleEstimate.lessons} <Text type="secondary" style={{ fontSize: 12 }}>节</Text>
                  </Text>
                </span>
                <span>
                  <Text type="secondary" style={{ fontSize: 12 }}>排课课时</Text>
                  <br />
                  <Text strong style={{ fontSize: 16 }}>
                    {scheduleEstimate.hours} <Text type="secondary" style={{ fontSize: 12 }}>/ {selectedCourseHours || '--'}</Text>
                  </Text>
                </span>
              </Space>
            </Col>
            <Col>
              {selectedCourseHours > 0 && scheduleEstimate.hours > 0 && (
                <Tag
                  color={
                    scheduleEstimate.hours === selectedCourseHours
                      ? 'success'
                      : scheduleEstimate.hours > selectedCourseHours
                        ? 'warning'
                        : 'processing'
                  }
                  style={{ fontSize: 13 }}
                >
                  {scheduleEstimate.hours === selectedCourseHours && '课时刚好匹配'}
                  {scheduleEstimate.hours > selectedCourseHours && '课时已超出'}
                  {scheduleEstimate.hours < selectedCourseHours && '课时未达标'}
                </Tag>
              )}
            </Col>
          </Row>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => {
    if (!preview) return null;
    return (
      <div>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic title="总排课数" value={preview.totalCount} suffix="节" />
          </Col>
          <Col span={6}>
            <Statistic
              title="可创建"
              value={normalCount}
              suffix="节"
              styles={{ content: { color: '#52c41a' } }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="有冲突（跳过）"
              value={conflictCount}
              suffix="节"
              styles={conflictCount > 0 ? { content: { color: '#ff4d4f' } } : undefined}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="排课课时 / 课程课时"
              value={`${preview.scheduledHours} / ${preview.courseHours || '-'}`}
            />
          </Col>
        </Row>

        {conflictCount > 0 && (
          <Alert
            type="warning"
            showIcon
            title={`${conflictCount} 节排课存在冲突，将自动跳过，仅创建 ${normalCount} 节正常排课`}
            style={{ marginBottom: 12 }}
          />
        )}

        <Table
          rowKey={(r) => `${r.date}-${r.startTime}`}
          columns={previewColumns}
          dataSource={preview.items}
          size="small"
          pagination={false}
          scroll={{ y: 320 }}
          rowClassName={(r) => (r.hasConflict ? 'batch-row-conflict' : '')}
        />
      </div>
    );
  };

  const stepItems = [
    { title: '基本信息' },
    { title: '排课规则' },
    { title: '预览确认' },
  ];

  const footer = () => {
    const btns: React.ReactNode[] = [];
    if (step > 0) {
      btns.push(
        <Button key="prev" onClick={() => setStep(step - 1)}>
          上一步
        </Button>,
      );
    }
    if (step === 0) {
      btns.push(
        <Button key="next" type="primary" onClick={goToStep2}>
          下一步
        </Button>,
      );
    }
    if (step === 1) {
      btns.push(
        <Button key="preview" type="primary" loading={loading} onClick={goToStep3}>
          预览排课
        </Button>,
      );
    }
    if (step === 2) {
      btns.push(
        <Popconfirm
          key="confirm"
          title={`确定批量创建 ${normalCount} 节排课？`}
          onConfirm={handleBatchCreate}
          disabled={normalCount === 0}
        >
          <Button
            type="primary"
            loading={creating}
            disabled={normalCount === 0}
          >
            确认创建 {normalCount} 节排课
          </Button>
        </Popconfirm>,
      );
    }
    return btns;
  };

  return (
    <Modal
      title="批量排课"
      open={open}
      onCancel={onClose}
      width={720}
      destroyOnHidden
      footer={footer()}
    >
      <Steps current={step} items={stepItems} style={{ marginBottom: 24 }} size="small" />
      <div style={{ display: step === 0 ? 'block' : 'none' }}>{renderStep1()}</div>
      <div style={{ display: step === 1 ? 'block' : 'none' }}>{renderStep2()}</div>
      {step === 2 && renderStep3()}

      <style>{`
        .batch-row-conflict td { background: #fff2f0 !important; }
      `}</style>
    </Modal>
  );
}
