import { useEffect, useRef, useState, useCallback } from 'react';
import { Popover, Tag, Space, Typography, Empty, message, Modal } from 'antd';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import { getCalendarEvents, updateSchedule, type ScheduleEvent } from '../../services/schedule';
import './calendar.css';

const { Text } = Typography;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  scheduled: { label: '已排课', color: 'blue' },
  ongoing: { label: '进行中', color: 'green' },
  completed: { label: '已完成', color: 'default' },
  canceled: { label: '已取消', color: 'red' },
};

/** 教室可用时间段 */
export interface TimeSlot {
  weekday: number; // 1=周一 ... 6=周六, 0=周日
  startTime: string; // "09:00"
  endTime: string; // "12:00"
}

interface ScheduleCalendarProps {
  classroomId?: string;
  teacherId?: string;
  classGroupId?: string;
  /** 教室可用时间段，在日历上显示为背景区域 */
  availableSlots?: TimeSlot[];
  /** 为 true 时，不传筛选条件则不加载数据 */
  requireFilter?: boolean;
  emptyText?: string;
  /** 变化时触发重新加载事件 */
  refreshKey?: number;
  /** 空白区域选择创建 */
  onSelect?: (start: Date, end: Date) => void;
  /** 点击事件编辑 */
  onEventClick?: (scheduleId: string) => void;
}

/** 将 weekday(1=周一..6=周六,0=周日) 转为 FullCalendar dayOfWeek(0=周日..6=周六) */
function toFcDayOfWeek(weekday: number): number {
  return weekday === 0 ? 0 : weekday; // 1=周一→1, 6=周六→6, 0=周日→0
}

/** 本地日期格式化为 YYYY-MM-DD，避免 toISOString() 的 UTC 时区偏移 */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 将 "HH:mm" 转为当天的分钟数 */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const SLOT_MIN = '07:00';
const SLOT_MAX = '22:00';

/**
 * 根据日历可见日期范围 + timeSlots 生成可用 + 不可用背景事件
 */
function buildBackgroundEvents(
  slots: TimeSlot[],
  from: string,
  to: string,
): any[] {
  if (!slots?.length || !from || !to) return [];
  const start = new Date(from);
  const end = new Date(to);
  const events: any[] = [];

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const fcDay = d.getDay();
    const dateStr = toLocalDateStr(d);

    // 收集当天所有可用段
    const daySlots = slots
      .filter((s) => toFcDayOfWeek(s.weekday) === fcDay)
      .map((s) => ({ start: s.startTime, end: s.endTime }))
      .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

    // 生成可用事件（加深绿色 + 左侧色条）
    for (const slot of daySlots) {
      events.push({
        id: `avail-${dateStr}-${slot.start}`,
        start: `${dateStr}T${slot.start}:00`,
        end: `${dateStr}T${slot.end}:00`,
        display: 'background',
        backgroundColor: 'rgba(82, 196, 26, 0.25)',
        borderColor: 'transparent',
        classNames: ['bg-available'],
      });
    }

    // 生成不可用事件（填充间隙）
    let cursor = SLOT_MIN;
    for (const slot of daySlots) {
      if (timeToMinutes(cursor) < timeToMinutes(slot.start)) {
        events.push({
          id: `unavail-${dateStr}-${cursor}`,
          start: `${dateStr}T${cursor}:00`,
          end: `${dateStr}T${slot.start}:00`,
          display: 'background',
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          borderColor: 'transparent',
          classNames: ['bg-unavailable'],
        });
      }
      cursor = slot.end;
    }
    // 尾部间隙
    if (timeToMinutes(cursor) < timeToMinutes(SLOT_MAX)) {
      events.push({
        id: `unavail-${dateStr}-${cursor}`,
        start: `${dateStr}T${cursor}:00`,
        end: `${dateStr}T${SLOT_MAX}:00`,
        display: 'background',
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderColor: 'transparent',
        classNames: ['bg-unavailable'],
      });
    }
  }
  return events;
}

/**
 * 检查时间范围是否完全落在教室可用时间段内
 */
export function isWithinAvailableSlots(
  start: Date,
  end: Date,
  slots: TimeSlot[],
): boolean {
  const dayOfWeek = start.getDay(); // 0=周日
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  return slots.some((s) => {
    if (toFcDayOfWeek(s.weekday) !== dayOfWeek) return false;
    return startMinutes >= timeToMinutes(s.startTime) && endMinutes <= timeToMinutes(s.endTime);
  });
}

export default function ScheduleCalendar({
  classroomId,
  teacherId,
  classGroupId,
  availableSlots,
  requireFilter = true,
  emptyText = '请先选择筛选条件',
  refreshKey,
  onSelect,
  onEventClick,
}: ScheduleCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const hasFilter = !!classroomId || !!teacherId || !!classGroupId;

  const fetchEvents = useCallback(async (from: string, to: string) => {
    if (!from || !to) return;
    if (requireFilter && !hasFilter) {
      setScheduleEvents([]);
      return;
    }
    try {
      const data = await getCalendarEvents({
        dateFrom: from,
        dateTo: to,
        classroomId,
        teacherId,
        classGroupId,
      });
      setScheduleEvents(data);
    } catch {
      /* ignore */
    }
  }, [classroomId, teacherId, classGroupId, requireFilter, hasFilter]);

  // 筛选条件变化 → 重新获取
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchEvents(dateRange.from, dateRange.to);
    }
  }, [dateRange, classroomId, teacherId, classGroupId]);

  // refreshKey 变化 → 重新获取（替代 key 销毁重建）
  useEffect(() => {
    if (refreshKey !== undefined && dateRange.from && dateRange.to) {
      fetchEvents(dateRange.from, dateRange.to);
    }
  }, [refreshKey]);

  const handleDatesSet = (arg: { startStr: string; endStr: string }) => {
    setDateRange({ from: arg.startStr, to: arg.endStr });
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const isMonthView = selectInfo.view.type === 'dayGridMonth';
    // 月视图没有精确时刻，跳过可用时间校验（由保存时检查）
    if (!isMonthView && availableSlots && availableSlots.length > 0) {
      if (!isWithinAvailableSlots(selectInfo.start, selectInfo.end, availableSlots)) {
        message.warning('所选时间不在教室可用时间范围内');
        selectInfo.view.calendar.unselect();
        return;
      }
    }
    onSelect?.(selectInfo.start, selectInfo.end);
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();
  };

  // 合并排课事件 + 可用时间段背景事件
  // 为排课事件添加 editable 属性（仅 scheduled 状态可拖拽）
  const editableScheduleEvents = scheduleEvents.map((e) => ({
    ...e,
    editable: e.extendedProps?.status === 'scheduled',
    durationEditable: e.extendedProps?.status === 'scheduled',
  }));
  const bgEvents = availableSlots
    ? buildBackgroundEvents(availableSlots, dateRange.from, dateRange.to)
    : [];
  const allEvents = [...editableScheduleEvents, ...bgEvents];

  // 点击事件 → 编辑
  const handleEventClick = (arg: EventClickArg) => {
    if (arg.event.display === 'background') return;
    const scheduleId = arg.event.id;
    if (scheduleId && onEventClick) {
      onEventClick(scheduleId);
    }
  };

  // 拖拽移动
  const handleEventDrop = async (arg: EventDropArg) => {
    const { event } = arg;
    if (event.extendedProps?.status !== 'scheduled') {
      arg.revert();
      message.warning('只能拖拽“已排课”状态的排课');
      return;
    }
    const newStart = event.start;
    const newEnd = event.end;
    if (!newStart || !newEnd) { arg.revert(); return; }
  
    // 校验可用时间段
    if (availableSlots && availableSlots.length > 0) {
      if (!isWithinAvailableSlots(newStart, newEnd, availableSlots)) {
        arg.revert();
        message.warning('目标时间不在教室可用时间范围内');
        return;
      }
    }

    try {
      await updateSchedule(event.id, {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
      });
      message.success('排课时间已更新');
      if (dateRange.from && dateRange.to) {
        fetchEvents(dateRange.from, dateRange.to);
      }
    } catch (err: any) {
      arg.revert();
      const msg = err?.response?.data?.message;
      message.error(msg === '存在时间冲突' ? '时间冲突，无法移动到该位置' : (msg || '更新失败'));
    }
  };

  // 拖拽调整大小
  const handleEventResize = async (arg: EventResizeDoneArg) => {
    const { event } = arg;
    if (event.extendedProps?.status !== 'scheduled') {
      arg.revert();
      message.warning('只能调整“已排课”状态的排课');
      return;
    }
    const newStart = event.start;
    const newEnd = event.end;
    if (!newStart || !newEnd) { arg.revert(); return; }
  
    // 校验可用时间段
    if (availableSlots && availableSlots.length > 0) {
      if (!isWithinAvailableSlots(newStart, newEnd, availableSlots)) {
        arg.revert();
        message.warning('调整后的时间超出教室可用时间范围');
        return;
      }
    }

    try {
      await updateSchedule(event.id, {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
      });
      message.success('排课时长已更新');
      if (dateRange.from && dateRange.to) {
        fetchEvents(dateRange.from, dateRange.to);
      }
    } catch (err: any) {
      arg.revert();
      const msg = err?.response?.data?.message;
      message.error(msg === '存在时间冲突' ? '时间冲突，无法调整到该时间' : (msg || '更新失败'));
    }
  };

  if (requireFilter && !hasFilter) {
    return (
      <div style={{ marginTop: 16 }}>
        <Empty description={emptyText} />
      </div>
    );
  }

  return (
    <div className="schedule-calendar">
      <div className="schedule-calendar-legend">
        {availableSlots && availableSlots.length > 0 && (
          <>
            <span className="legend-item">
              <span className="legend-swatch" style={{ backgroundColor: 'rgba(82, 196, 26, 0.25)', border: '1px solid rgba(82, 196, 26, 0.5)' }} />
              可用时间
            </span>
            <span className="legend-item">
              <span className="legend-swatch" style={{ backgroundColor: 'rgba(0, 0, 0, 0.04)', border: '1px solid #e8e8e8' }} />
              不可用时间
            </span>
          </>
        )}
        <span className="legend-item">
          <span className="legend-swatch" style={{ backgroundColor: '#1677ff' }} />
          已排课
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ backgroundColor: '#52c41a' }} />
          进行中
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ backgroundColor: '#d9d9d9' }} />
          已完成
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ backgroundColor: '#ff4d4f' }} />
          已取消
        </span>
      </div>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        locale="zh-cn"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek',
        }}
        buttonText={{ today: '今天', month: '月视图', week: '周视图' }}
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={false}
        selectable={!!onSelect}
        selectMirror
        editable
        eventDurationEditable
        snapDuration="00:15:00"
        height="auto"
        events={allEvents}
        datesSet={handleDatesSet}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        eventContent={(arg) => {
          // 背景事件不需要自定义渲染
          if (arg.event.display === 'background') return null;

          const ext = arg.event.extendedProps;
          const st = STATUS_MAP[ext.status] || STATUS_MAP.scheduled;
          const isMonthView = arg.view.type === 'dayGridMonth';

          if (isMonthView) {
            return (
              <Popover
                title={arg.event.title}
                trigger="hover"
                content={
                  <Space orientation="vertical" size={4}>
                    <Text><Text strong>状态：</Text><Tag color={st.color}>{st.label}</Tag></Text>
                    <Text><Text strong>教室：</Text>{ext.classroomName}{ext.venueName ? ` (${ext.venueName})` : ''}</Text>
                    <Text><Text strong>老师：</Text>{ext.teacherName}</Text>
                    {ext.assistantName && <Text><Text strong>助教：</Text>{ext.assistantName}</Text>}
                  </Space>
                }
              >
                <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 2px' }}>
                  {ext.courseName}
                </div>
              </Popover>
            );
          }

          return (
            <Popover
              title={arg.event.title}
              trigger="hover"
              content={
                <Space orientation="vertical" size={4}>
                  <Text><Text strong>状态：</Text><Tag color={st.color}>{st.label}</Tag></Text>
                  <Text><Text strong>教室：</Text>{ext.classroomName}{ext.venueName ? ` (${ext.venueName})` : ''}</Text>
                  <Text><Text strong>老师：</Text>{ext.teacherName}</Text>
                  {ext.assistantName && <Text><Text strong>助教：</Text>{ext.assistantName}</Text>}
                </Space>
              }
            >
              <div style={{ padding: 2, overflow: 'hidden', height: '100%' }}>
                <Space orientation="vertical" size={2}>
                  <Text strong style={{ fontSize: 12, color: '#fff' }}>{ext.courseName}</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{ext.teacherName}</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
                    {ext.classroomName}{ext.venueName ? ` (${ext.venueName})` : ''}
                  </Text>
                </Space>
              </div>
            </Popover>
          );
        }}
      />
    </div>
  );
}
