import { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  TimePicker,
  Alert,
  Space,
  message,
} from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { getCourses } from '../../services/course';
import { getTeacherSimpleList } from '../../services/teacher';
import { getVenues, getClassrooms } from '../../services/venue';
import { getClassGroups } from '../../services/classGroup';
import { createSchedule, updateSchedule, checkConflicts } from '../../services/schedule';
import type { Schedule, ConflictResult } from '../../services/schedule';
import type { TimeSlot } from './ScheduleCalendar';
import { isWithinAvailableSlots } from './ScheduleCalendar';

interface ScheduleModalProps {
  open: boolean;
  editData?: Schedule | null;
  prefillStart?: Date;
  prefillEnd?: Date;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScheduleModal({
  open,
  editData,
  prefillStart,
  prefillEnd,
  onClose,
  onSuccess,
}: ScheduleModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; userId: string; realName: string }[]>([]);
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; capacity: number; timeSlots?: TimeSlot[] | null }[]>([]);
  const [classGroupOptions, setClassGroupOptions] = useState<{ id: string; name: string }[]>([]);
  const [conflictResult, setConflictResult] = useState<ConflictResult | null>(null);

  useEffect(() => {
    if (open) {
      loadOptions();
      if (editData) {
        form.setFieldsValue({
          courseId: editData.courseId,
          classGroupId: editData.classGroupId || undefined,
          venueId: editData.classroom?.venue?.id,
          classroomId: editData.classroomId,
          teacherId: editData.teacherId,
          assistantId: editData.assistantId || undefined,
          date: dayjs(editData.startTime),
          startTime: dayjs(editData.startTime),
          endTime: dayjs(editData.endTime),
        });
        if (editData.classroom?.venue?.id) {
          loadClassrooms(editData.classroom.venue.id);
        }
        if (editData.courseId) {
          loadClassGroupsForCourse(editData.courseId);
        }
      } else if (prefillStart && prefillEnd) {
        form.setFieldsValue({
          date: dayjs(prefillStart),
          startTime: dayjs(prefillStart),
          endTime: dayjs(prefillEnd),
        });
      }
    }
    return () => {
      setConflictResult(null);
      setClassrooms([]);
      setClassGroupOptions([]);
    };
  }, [open]);

  const loadOptions = async () => {
    try {
      const [courseRes, teacherRes, venueRes] = await Promise.all([
        getCourses({ status: 'published', pageSize: 200 }),
        getTeacherSimpleList(),
        getVenues({ status: 'approved', pageSize: 200 }) as any,
      ]);
      setCourses((courseRes as any).items || []);
      setTeachers(teacherRes || []);
      setVenues(((venueRes as any).items || []).map((v: any) => ({ id: v.id, name: v.name })));
    } catch {
      /* ignore */
    }
  };

  const loadClassrooms = async (venueId: string) => {
    try {
      const data = await getClassrooms(venueId);
      setClassrooms(
        ((data as any) || [])
          .filter((c: any) => c.status === 'active')
          .map((c: any) => ({ id: c.id, name: c.name, capacity: c.capacity, timeSlots: c.timeSlots })),
      );
    } catch {
      setClassrooms([]);
    }
  };

  const loadClassGroupsForCourse = async (courseId: string) => {
    try {
      const res = await getClassGroups({ courseId, pageSize: 200 });
      setClassGroupOptions((res.items || []).map((g: any) => ({ id: g.id, name: g.name })));
    } catch {
      setClassGroupOptions([]);
    }
  };

  const handleVenueChange = (venueId: string) => {
    form.setFieldValue('classroomId', undefined);
    setClassrooms([]);
    if (venueId) loadClassrooms(venueId);
  };

  const doCheckConflicts = useCallback(async () => {
    try {
      const values = form.getFieldsValue();
      const { classroomId, teacherId, assistantId, date, startTime, endTime } = values;
      if (!classroomId || !teacherId || !date || !startTime || !endTime) {
        setConflictResult(null);
        return;
      }
      const d = (date as Dayjs).format('YYYY-MM-DD');
      const st = `${d}T${(startTime as Dayjs).format('HH:mm')}:00`;
      const et = `${d}T${(endTime as Dayjs).format('HH:mm')}:00`;
      const result = await checkConflicts({
        classroomId,
        teacherId,
        assistantId: assistantId || undefined,
        startTime: st,
        endTime: et,
        excludeId: editData?.id,
      });
      setConflictResult(result);
    } catch {
      setConflictResult(null);
    }
  }, [form, editData]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const d = (values.date as Dayjs).format('YYYY-MM-DD');
      const st = `${d}T${(values.startTime as Dayjs).format('HH:mm')}:00`;
      const et = `${d}T${(values.endTime as Dayjs).format('HH:mm')}:00`;

      const payload = {
        courseId: values.courseId,
        classroomId: values.classroomId,
        teacherId: values.teacherId,
        assistantId: values.assistantId || undefined,
        classGroupId: values.classGroupId || undefined,
        startTime: st,
        endTime: et,
      };

      // 校验教室可用时间段
      const selectedClassroom = classrooms.find((c) => c.id === values.classroomId);
      if (selectedClassroom?.timeSlots && selectedClassroom.timeSlots.length > 0) {
        const schedStart = new Date(st);
        const schedEnd = new Date(et);
        if (!isWithinAvailableSlots(schedStart, schedEnd, selectedClassroom.timeSlots)) {
          message.error('排课时间不在教室可用时间范围内，请检查后重试');
          setLoading(false);
          return;
        }
      }

      if (editData) {
        await updateSchedule(editData.id, payload);
        message.success('排课已更新');
      } else {
        await createSchedule(payload);
        message.success('排课创建成功');
      }
      onSuccess();
    } catch (err: any) {
      if (err?.response?.data?.conflicts) {
        setConflictResult(err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const conflictTypeMap: Record<string, string> = {
    classroom: '教室',
    teacher: '老师',
    assistant: '助教',
  };

  return (
    <Modal
      title={editData ? '编辑排课' : '新建排课'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={560}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="courseId" label="课程" rules={[{ required: true, message: '请选择课程' }]}>
          <Select
            showSearch
            placeholder="搜索选择课程"
            optionFilterProp="label"
            options={courses.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(v) => {
              form.setFieldValue('classGroupId', undefined);
              setClassGroupOptions([]);
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
            disabled={classGroupOptions.length === 0}
            options={classGroupOptions.map((g) => ({ value: g.id, label: g.name }))}
          />
        </Form.Item>

        <Space size={16} style={{ display: 'flex' }}>
          <Form.Item name="venueId" label="场地" rules={[{ required: true, message: '请选择场地' }]} style={{ flex: 1 }}>
            <Select
              showSearch
              placeholder="选择场地"
              optionFilterProp="label"
              options={venues.map((v) => ({ value: v.id, label: v.name }))}
              onChange={handleVenueChange}
            />
          </Form.Item>
          <Form.Item name="classroomId" label="教室" rules={[{ required: true, message: '请选择教室' }]} style={{ flex: 1 }}>
            <Select
              placeholder="先选场地"
              disabled={classrooms.length === 0}
              options={classrooms.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.capacity}人)`,
              }))}
              onChange={() => doCheckConflicts()}
            />
          </Form.Item>
        </Space>

        <Form.Item name="teacherId" label="老师" rules={[{ required: true, message: '请选择老师' }]}>
          <Select
            showSearch
            placeholder="搜索选择老师"
            optionFilterProp="label"
            options={teachers.map((t) => ({ value: t.id, label: t.realName }))}
            onChange={() => doCheckConflicts()}
          />
        </Form.Item>

        <Form.Item name="assistantId" label="助教（可选）">
          <Select
            allowClear
            showSearch
            placeholder="搜索选择助教"
            optionFilterProp="label"
            options={teachers.map((t) => ({ value: t.userId, label: t.realName }))}
            onChange={() => doCheckConflicts()}
          />
        </Form.Item>

        <Space size={16} style={{ display: 'flex' }}>
          <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择日期' }]} style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} onChange={() => doCheckConflicts()} />
          </Form.Item>
          <Form.Item name="startTime" label="开始时间" rules={[{ required: true, message: '请选择' }]} style={{ flex: 1 }}>
            <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} onChange={() => doCheckConflicts()} />
          </Form.Item>
          <Form.Item name="endTime" label="结束时间" rules={[{ required: true, message: '请选择' }]} style={{ flex: 1 }}>
            <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} onChange={() => doCheckConflicts()} />
          </Form.Item>
        </Space>

        {conflictResult?.hasConflict && (
          <Alert
            type="error"
            showIcon
            message="时间冲突"
            description={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {conflictResult.conflicts.map((c, i) => (
                  <li key={i}>
                    {conflictTypeMap[c.type] || c.type}冲突：
                    {c.schedule.course?.name} ({dayjs(c.schedule.startTime).format('HH:mm')}-
                    {dayjs(c.schedule.endTime).format('HH:mm')})
                  </li>
                ))}
              </ul>
            }
            style={{ marginBottom: 16 }}
          />
        )}
      </Form>
    </Modal>
  );
}
