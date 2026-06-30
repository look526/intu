import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    course: { select: { id: true, name: true, totalHours: true } },
    classroom: {
      select: {
        id: true,
        name: true,
        capacity: true,
        venue: { select: { id: true, name: true } },
      },
    },
    teacher: { select: { id: true, realName: true } },
    assistant: { select: { id: true, nickname: true, phone: true } },
    creator: { select: { id: true, nickname: true } },
    classGroup: { select: { id: true, name: true, status: true } },
  };

  // ==================== 冲突检测核心 ====================

  async checkConflicts(params: {
    classroomId: string;
    teacherId: string;
    assistantId?: string;
    startTime: Date;
    endTime: Date;
    excludeId?: string;
  }) {
    const { classroomId, teacherId, assistantId, startTime, endTime, excludeId } = params;
    const conflicts: { type: string; schedule: any }[] = [];

    const baseWhere: any = {
      status: { not: 'canceled' },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    };
    if (excludeId) {
      baseWhere.id = { not: excludeId };
    }

    // 教室冲突
    const classroomConflicts = await this.prisma.schedule.findMany({
      where: { ...baseWhere, classroomId },
      include: this.includeRelations,
    });
    for (const s of classroomConflicts) {
      conflicts.push({ type: 'classroom', schedule: s });
    }

    // 老师冲突
    const teacherConflicts = await this.prisma.schedule.findMany({
      where: { ...baseWhere, teacherId },
      include: this.includeRelations,
    });
    for (const s of teacherConflicts) {
      if (!conflicts.find((c) => c.schedule.id === s.id)) {
        conflicts.push({ type: 'teacher', schedule: s });
      }
    }

    // 助教冲突
    if (assistantId) {
      const assistantConflicts = await this.prisma.schedule.findMany({
        where: { ...baseWhere, assistantId },
        include: this.includeRelations,
      });
      for (const s of assistantConflicts) {
        if (!conflicts.find((c) => c.schedule.id === s.id)) {
          conflicts.push({ type: 'assistant', schedule: s });
        }
      }
    }

    return { hasConflict: conflicts.length > 0, conflicts };
  }

  // ==================== CRUD ====================

  async getClassroomOccupied(classroomId: string, dateFrom: string) {
    const fromDate = new Date(dateFrom);
    const schedules = await this.prisma.schedule.findMany({
      where: {
        classroomId,
        status: { not: 'canceled' },
        startTime: { gte: fromDate },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        course: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
      take: 100,
    });

    return schedules.map((s) => {
      const st = new Date(s.startTime);
      const et = new Date(s.endTime);
      return {
        id: s.id,
        date: `${st.getFullYear()}-${String(st.getMonth() + 1).padStart(2, '0')}-${String(st.getDate()).padStart(2, '0')}`,
        weekday: st.getDay(),
        startTime: `${String(st.getHours()).padStart(2, '0')}:${String(st.getMinutes()).padStart(2, '0')}`,
        endTime: `${String(et.getHours()).padStart(2, '0')}:${String(et.getMinutes()).padStart(2, '0')}`,
        courseName: s.course?.name || '',
      };
    });
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    dateFrom?: string;
    dateTo?: string;
    classroomId?: string;
    teacherId?: string;
    courseId?: string;
    classGroupId?: string;
    status?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (query.dateFrom) where.startTime = { gte: new Date(query.dateFrom) };
    if (query.dateTo) {
      where.endTime = { ...(where.endTime || {}), lte: new Date(query.dateTo) };
    }
    if (query.classroomId) where.classroomId = query.classroomId;
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.courseId) where.courseId = query.courseId;
    if (query.classGroupId) where.classGroupId = query.classGroupId;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.schedule.findMany({
        where,
        skip,
        take: pageSize,
        include: this.includeRelations,
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.schedule.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: this.includeRelations,
    });
    if (!schedule) throw new NotFoundException('排课不存在');
    return schedule;
  }

  async create(
    data: {
      courseId: string;
      classroomId: string;
      teacherId: string;
      assistantId?: string;
      classGroupId?: string;
      startTime: string;
      endTime: string;
    },
    userId: string,
  ) {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }

    const result = await this.checkConflicts({
      classroomId: data.classroomId,
      teacherId: data.teacherId,
      assistantId: data.assistantId,
      startTime,
      endTime,
    });

    if (result.hasConflict) {
      throw new BadRequestException({
        message: '存在时间冲突',
        conflicts: result.conflicts,
      });
    }

    return this.prisma.schedule.create({
      data: {
        course: { connect: { id: data.courseId } },
        classroom: { connect: { id: data.classroomId } },
        teacher: { connect: { id: data.teacherId } },
        ...(data.assistantId ? { assistant: { connect: { id: data.assistantId } } } : {}),
        ...(data.classGroupId ? { classGroup: { connect: { id: data.classGroupId } } } : {}),
        startTime,
        endTime,
        creator: { connect: { id: userId } },
      },
      include: this.includeRelations,
    });
  }

  async update(
    id: string,
    data: {
      courseId?: string;
      classroomId?: string;
      teacherId?: string;
      assistantId?: string;
      classGroupId?: string;
      startTime?: string;
      endTime?: string;
    },
  ) {
    const existing = await this.ensureExists(id);
    if (existing.status !== 'scheduled') {
      throw new BadRequestException('只能修改"已排课"状态的排课');
    }

    const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
    const endTime = data.endTime ? new Date(data.endTime) : existing.endTime;

    if (endTime <= startTime) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }

    const result = await this.checkConflicts({
      classroomId: data.classroomId || existing.classroomId,
      teacherId: data.teacherId || existing.teacherId,
      assistantId: data.assistantId !== undefined ? (data.assistantId || undefined) : (existing.assistantId || undefined),
      startTime,
      endTime,
      excludeId: id,
    });

    if (result.hasConflict) {
      throw new BadRequestException({
        message: '存在时间冲突',
        conflicts: result.conflicts,
      });
    }

    const updateData: any = { ...data };
    if (data.startTime) updateData.startTime = startTime;
    if (data.endTime) updateData.endTime = endTime;
    if (data.classGroupId !== undefined) {
      updateData.classGroupId = data.classGroupId || null;
    }

    return this.prisma.schedule.update({
      where: { id },
      data: updateData,
      include: this.includeRelations,
    });
  }

  async cancel(id: string) {
    const existing = await this.ensureExists(id);
    if (existing.status !== 'scheduled') {
      throw new BadRequestException('只能取消"已排课"状态的排课');
    }
    return this.prisma.schedule.update({
      where: { id },
      data: { status: 'canceled' },
      include: this.includeRelations,
    });
  }

  async updateStatus(id: string, status: 'ongoing' | 'completed') {
    const existing = await this.ensureExists(id);
    const validTransitions: Record<string, string[]> = {
      scheduled: ['ongoing'],
      ongoing: ['completed'],
    };
    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `不能从 "${existing.status}" 转换到 "${status}"`,
      );
    }
    return this.prisma.schedule.update({
      where: { id },
      data: { status },
      include: this.includeRelations,
    });
  }

  // ==================== 日历事件 ====================

  async getCalendarEvents(query: {
    dateFrom: string;
    dateTo: string;
    classroomId?: string;
    teacherId?: string;
    classGroupId?: string;
  }) {
    const where: any = {
      startTime: { gte: new Date(query.dateFrom) },
      endTime: { lte: new Date(query.dateTo) },
    };
    if (query.classroomId) where.classroomId = query.classroomId;
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.classGroupId) where.classGroupId = query.classGroupId;

    const schedules = await this.prisma.schedule.findMany({
      where,
      include: this.includeRelations,
      orderBy: { startTime: 'asc' },
    });

    const statusColors: Record<string, string> = {
      scheduled: '#1677ff',
      ongoing: '#52c41a',
      completed: '#999999',
      canceled: '#ff4d4f',
    };

    return schedules.map((s) => ({
      id: s.id,
      title: `${(s as any).course?.name || ''} - ${(s as any).teacher?.realName || ''}`,
      start: s.startTime,
      end: s.endTime,
      color: statusColors[s.status] || '#1677ff',
      extendedProps: {
        courseId: s.courseId,
        courseName: (s as any).course?.name,
        classroomId: s.classroomId,
        classroomName: (s as any).classroom?.name,
        venueName: (s as any).classroom?.venue?.name,
        teacherId: s.teacherId,
        teacherName: (s as any).teacher?.realName,
        assistantId: s.assistantId,
        assistantName: (s as any).assistant?.nickname,
        status: s.status,
        classGroupId: s.classGroupId,
        classGroupName: (s as any).classGroup?.name,
      },
    }));
  }

  // ==================== 学员端：我的排课 ====================

  /**
   * 获取学员今日排课
   * 逻辑：userId -> Student -> ClassGroupStudent -> classGroupIds -> 今日 Schedule
   */
  async findMyToday(userId: string) {
    return this.findMyByDate(userId, new Date().toISOString().slice(0, 10));
  }

  /**
   * 获取学员指定日期的排课
   * 新逻辑：通过班级关联查排课（替代原来的订单->课程->排课）
   */
  async findMyByDate(userId: string, date: string) {
    // 1. 找到学员
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    if (!student) return [];

    // 2. 通过班级关联查 classGroupIds
    const classGroupStudents = await this.prisma.classGroupStudent.findMany({
      where: { studentId: student.id },
      select: { classGroupId: true },
    });
    const classGroupIds = classGroupStudents.map((cgs) => cgs.classGroupId);
    if (classGroupIds.length === 0) return [];

    // 3. 计算日期范围（当天 00:00 ~ 次日 00:00）
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59.999`);

    // 4. 查询排课（通过班级 ID）
    const schedules = await this.prisma.schedule.findMany({
      where: {
        classGroupId: { in: classGroupIds },
        startTime: { gte: dayStart, lte: dayEnd },
        status: { not: 'canceled' },
      },
      include: this.includeRelations,
      orderBy: { startTime: 'asc' },
    });

    // 5. 查询打卡和评价状态
    const scheduleIds = schedules.map((s) => s.id);
    if (scheduleIds.length === 0) return [];

    const [checkins, reviews] = await Promise.all([
      this.prisma.checkinRecord.findMany({
        where: { studentId: student.id, scheduleId: { in: scheduleIds } },
        select: { scheduleId: true },
      }),
      this.prisma.courseReview.findMany({
        where: { studentId: student.id, scheduleId: { in: scheduleIds } },
        select: { scheduleId: true },
      }),
    ]);

    const checkedInSet = new Set(checkins.map((c) => c.scheduleId));
    const reviewedSet = new Set(reviews.map((r) => r.scheduleId));

    return schedules.map((s) => ({
      ...s,
      checkedIn: checkedInSet.has(s.id),
      hasReviewed: reviewedSet.has(s.id),
    }));
  }

  /** 获取学员某月有课的日期列表（轻量接口，只返回日期字符串数组） */
  async findMyDates(userId: string, year: number, month: number): Promise<string[]> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    if (!student) return [];

    const classGroupStudents = await this.prisma.classGroupStudent.findMany({
      where: { studentId: student.id },
      select: { classGroupId: true },
    });
    const classGroupIds = classGroupStudents.map((cgs) => cgs.classGroupId);
    if (classGroupIds.length === 0) return [];

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        classGroupId: { in: classGroupIds },
        startTime: { gte: monthStart, lte: monthEnd },
        status: { not: 'canceled' },
      },
      select: { startTime: true },
    });

    // 提取去重日期
    const dateSet = new Set<string>();
    for (const s of schedules) {
      const d = new Date(s.startTime);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dateSet.add(dateStr);
    }
    return [...dateSet].sort();
  }

  // ==================== 批量排课 ====================

  /**
   * 根据周期规则 + 日期范围展开所有具体排课时间
   */
  private expandRules(
    rules: { weekday: number; startTime: string; endTime: string }[],
    dateFrom: string,
    dateTo: string,
    skipDates?: string[],
  ) {
    const skipSet = new Set(skipDates || []);
    const items: { date: string; weekday: number; startTime: string; endTime: string }[] = [];
    const start = new Date(dateFrom);
    const end = new Date(dateTo);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const jsDay = d.getDay(); // 0=Sun
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      if (skipSet.has(dateStr)) continue;

      for (const rule of rules) {
        const ruleDay = rule.weekday === 0 ? 0 : rule.weekday; // 1=Mon..6=Sat,0=Sun
        if (ruleDay === jsDay) {
          items.push({
            date: dateStr,
            weekday: rule.weekday,
            startTime: rule.startTime,
            endTime: rule.endTime,
          });
        }
      }
    }

    return items.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.startTime < b.startTime ? -1 : 1;
    });
  }

  /**
   * 批量预览 - 展开规则并检测冲突，不实际创建
   */
  async batchPreview(data: {
    courseId: string;
    classroomId: string;
    teacherId: string;
    assistantId?: string;
    rules: { weekday: number; startTime: string; endTime: string }[];
    dateFrom: string;
    dateTo: string;
    skipDates?: string[];
  }) {
    const items = this.expandRules(data.rules, data.dateFrom, data.dateTo, data.skipDates);

    // 获取课程 totalHours
    const course = await this.prisma.course.findUnique({
      where: { id: data.courseId },
      select: { totalHours: true },
    });
    const courseHours = course?.totalHours || 0;

    // 获取教室可用时间段
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: data.classroomId },
      select: { timeSlots: true },
    });
    const timeSlots = (classroom?.timeSlots as any[]) || [];

    let scheduledMinutes = 0;
    const previewItems: {
      date: string;
      weekday: number;
      startTime: string;
      endTime: string;
      hasConflict: boolean;
      conflictReasons: string[];
    }[] = [];

    for (const item of items) {
      const st = new Date(`${item.date}T${item.startTime}:00`);
      const et = new Date(`${item.date}T${item.endTime}:00`);
      const reasons: string[] = [];

      // 检查教室可用时间段
      if (timeSlots.length > 0) {
        const jsDay = st.getDay();
        const startMin = st.getHours() * 60 + st.getMinutes();
        const endMin = et.getHours() * 60 + et.getMinutes();
        const inSlot = timeSlots.some((s: any) => {
          const slotDay = s.weekday === 0 ? 0 : s.weekday;
          if (slotDay !== jsDay) return false;
          const [sh, sm] = (s.startTime as string).split(':').map(Number);
          const [eh, em] = (s.endTime as string).split(':').map(Number);
          return startMin >= sh * 60 + sm && endMin <= eh * 60 + em;
        });
        if (!inSlot) reasons.push('不在教室可用时间内');
      }

      // 检查排课冲突
      const result = await this.checkConflicts({
        classroomId: data.classroomId,
        teacherId: data.teacherId,
        assistantId: data.assistantId,
        startTime: st,
        endTime: et,
      });
      if (result.hasConflict) {
        for (const c of result.conflicts) {
          const typeName = c.type === 'classroom' ? '教室' : c.type === 'teacher' ? '老师' : '助教';
          reasons.push(`${typeName}时间冲突`);
        }
      }

      const durationMin = (et.getTime() - st.getTime()) / 60000;
      scheduledMinutes += durationMin;

      previewItems.push({
        ...item,
        hasConflict: reasons.length > 0,
        conflictReasons: reasons,
      });
    }

    return {
      totalCount: previewItems.length,
      scheduledHours: Math.round((scheduledMinutes / 60) * 10) / 10,
      courseHours,
      items: previewItems,
    };
  }

  /**
   * 批量创建 - 展开规则，跳过有冲突的，创建其余
   */
  async batchCreate(
    data: {
      courseId: string;
      classGroupId?: string;
      classroomId: string;
      teacherId: string;
      assistantId?: string;
      rules: { weekday: number; startTime: string; endTime: string }[];
      dateFrom: string;
      dateTo: string;
      skipDates?: string[];
    },
    userId: string,
  ) {
    const preview = await this.batchPreview(data);
    const validItems = preview.items.filter((i) => !i.hasConflict);
    const skippedItems = preview.items.filter((i) => i.hasConflict);

    if (validItems.length === 0) {
      throw new BadRequestException({
        message: '所有排课均存在冲突，无法创建',
        preview,
      });
    }

    // 批量创建（事务）
    const created = await this.prisma.$transaction(
      validItems.map((item) => {
        const st = new Date(`${item.date}T${item.startTime}:00`);
        const et = new Date(`${item.date}T${item.endTime}:00`);
        return this.prisma.schedule.create({
          data: {
            course: { connect: { id: data.courseId } },
            classroom: { connect: { id: data.classroomId } },
            teacher: { connect: { id: data.teacherId } },
            ...(data.assistantId ? { assistant: { connect: { id: data.assistantId } } } : {}),
            ...(data.classGroupId ? { classGroup: { connect: { id: data.classGroupId } } } : {}),
            startTime: st,
            endTime: et,
            creator: { connect: { id: userId } },
          },
          include: this.includeRelations,
        });
      }),
    );

    return {
      createdCount: created.length,
      skippedCount: skippedItems.length,
      skipped: skippedItems.map((i) => ({
        date: i.date,
        startTime: i.startTime,
        endTime: i.endTime,
        reasons: i.conflictReasons,
      })),
    };
  }

  private async ensureExists(id: string) {
    const schedule = await this.prisma.schedule.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundException('排课不存在');
    return schedule;
  }
}
