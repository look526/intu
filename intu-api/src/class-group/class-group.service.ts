import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClassGroupStatus } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ClassGroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // ==================== 班级 CRUD ====================

  /** 班级列表 */
  async findAll(query: {
    page?: number;
    pageSize?: number;
    courseId?: string;
    status?: string;
    keyword?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: any = {};

    if (query.courseId) where.courseId = query.courseId;
    if (query.status) where.status = query.status;
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { course: { name: { contains: query.keyword } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.classGroup.findMany({
        where,
        include: {
          course: { select: { id: true, name: true } },
          _count: { select: { students: true, schedules: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.classGroup.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 班级详情 */
  async findOne(id: string) {
    const classGroup = await this.prisma.classGroup.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, name: true, totalHours: true, price: true } },
        students: {
          include: {
            student: {
              select: {
                id: true,
                userId: true,
                user: { select: { phone: true, nickname: true, avatar: true } },
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
        schedules: {
          where: { status: { not: 'canceled' } },
          select: { startTime: true, endTime: true },
        },
        _count: { select: { students: true, schedules: true } },
      },
    });
    if (!classGroup) throw new NotFoundException('班级不存在');

    // 计算已排课时数
    const scheduledHours = classGroup.schedules.reduce((sum, s) => {
      return sum + (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60 * 60);
    }, 0);

    const { schedules: _, ...rest } = classGroup;
    return { ...rest, scheduledHours: Math.round(scheduledHours * 10) / 10 };
  }

  /** 创建班级（支持同时关联学员 + 设置状态） */
  async create(data: {
    name: string;
    courseId: string;
    maxStudents?: number;
    startDate?: string;
    endDate?: string;
    studentIds?: string[];
    status?: ClassGroupStatus;
  }) {
    const course = await this.prisma.course.findUnique({
      where: { id: data.courseId },
    });
    if (!course) throw new NotFoundException('课程不存在');

    const maxStudents = data.maxStudents ?? 30;

    // 创建班级
    const classGroup = await this.prisma.classGroup.create({
      data: {
        name: data.name,
        course: { connect: { id: data.courseId } },
        maxStudents,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
      include: {
        course: { select: { id: true, name: true } },
        _count: { select: { students: true } },
      },
    });

    // 关联学员
    if (data.studentIds && data.studentIds.length > 0) {
      if (data.studentIds.length > maxStudents) {
        throw new BadRequestException(
          `选择的学员数（${data.studentIds.length}）超出班级人数上限（${maxStudents}）`,
        );
      }
      await this.prisma.classGroupStudent.createMany({
        data: data.studentIds.map((studentId) => ({
          classGroupId: classGroup.id,
          studentId,
        })),
        skipDuplicates: true,
      });

      // 发送分班通知
      const students = await this.prisma.student.findMany({
        where: { id: { in: data.studentIds } },
        select: { userId: true },
      });
      const userIds = students.map((s) => s.userId);
      this.notificationService.notifyBatch(
        userIds,
        'class_assigned',
        '分班通知',
        `您已被分配到「${classGroup.name}」班级（${course.name}）`,
        { targetUrl: `/pages/classgroup/detail/index?id=${classGroup.id}` },
      );
    }

    // 设置状态（如果不是默认的 forming）
    if (data.status && data.status !== 'forming') {
      // 直接设置状态（创建时跳过状态机流转限制）
      const updated = await this.prisma.classGroup.update({
        where: { id: classGroup.id },
        data: { status: data.status },
        include: {
          course: { select: { id: true, name: true } },
          _count: { select: { students: true } },
        },
      });

      // 发送开课/结业通知
      if (data.status === 'active' || data.status === 'completed') {
        await this.sendStatusNotification(classGroup.id, classGroup.name, course.name, data.status);
      }

      return updated;
    }

    return this.findOne(classGroup.id);
  }

  /** 修改班级（状态变更时自动发送通知） */
  async update(
    id: string,
    data: {
      name?: string;
      maxStudents?: number;
      startDate?: string;
      endDate?: string;
      status?: ClassGroupStatus;
    },
  ) {
    const existing = await this.ensureExists(id);
    const oldStatus = existing.status;

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.maxStudents !== undefined) updateData.maxStudents = data.maxStudents;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await this.prisma.classGroup.update({
      where: { id },
      data: updateData,
      include: {
        course: { select: { id: true, name: true } },
        _count: { select: { students: true } },
      },
    });

    // 状态变更时发送通知
    if (data.status && data.status !== oldStatus) {
      if (data.status === 'active' || data.status === 'completed') {
        const courseName = updated.course?.name || '课程';
        await this.sendStatusNotification(id, existing.name, courseName, data.status);
      }
    }

    return updated;
  }

  /** 发送状态变更通知（开课/结业） */
  private async sendStatusNotification(
    classGroupId: string,
    className: string,
    courseName: string,
    status: 'active' | 'completed',
  ) {
    const members = await this.prisma.classGroupStudent.findMany({
      where: { classGroupId },
      include: { student: { select: { userId: true } } },
    });
    const userIds = members.map((m) => m.student.userId);
    if (userIds.length === 0) return;

    if (status === 'active') {
      this.notificationService.notifyBatch(
        userIds,
        'class_started',
        '开课通知',
        `您所在的「${className}」班级（${courseName}）已正式开课`,
        { targetUrl: `/pages/classgroup/detail/index?id=${classGroupId}` },
      );
    } else {
      this.notificationService.notifyBatch(
        userIds,
        'class_started',
        '结业通知',
        `您所在的「${className}」班级（${courseName}）已结业，感谢您的参与`,
        { targetUrl: `/pages/classgroup/detail/index?id=${classGroupId}` },
      );
    }
  }

  // ==================== 分班操作 ====================

  /** 批量添加学员到班级 */
  async addStudents(classGroupId: string, studentIds: string[]) {
    const classGroup = await this.ensureExists(classGroupId);

    if (classGroup.status !== 'forming') {
      throw new BadRequestException('只有组建中的班级可以添加学员');
    }

    // 检查人数上限
    const currentCount = await this.prisma.classGroupStudent.count({
      where: { classGroupId },
    });
    if (currentCount + studentIds.length > classGroup.maxStudents) {
      throw new BadRequestException(
        `超出班级人数上限（${classGroup.maxStudents}），当前已有 ${currentCount} 人`,
      );
    }

    await this.prisma.classGroupStudent.createMany({
      data: studentIds.map((studentId) => ({
        classGroupId,
        studentId,
      })),
      skipDuplicates: true,
    });

    // 发送分班通知
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { userId: true },
    });
    const userIds = students.map((s) => s.userId);
    const course = await this.prisma.course.findFirst({
      where: { classGroups: { some: { id: classGroupId } } },
      select: { name: true },
    });
    this.notificationService.notifyBatch(
      userIds,
      'class_assigned',
      '分班通知',
      `您已被分配到「${classGroup.name}」班级（${course?.name || '课程'}）`,
      { targetUrl: `/pages/classgroup/detail/index?id=${classGroupId}` },
    );

    return this.findOne(classGroupId);
  }

  /** 从班级移除学员 */
  async removeStudent(classGroupId: string, studentId: string) {
    const classGroup = await this.ensureExists(classGroupId);

    if (classGroup.status !== 'forming') {
      throw new BadRequestException('只有组建中的班级可以移除学员');
    }

    await this.prisma.classGroupStudent.delete({
      where: {
        classGroupId_studentId: { classGroupId, studentId },
      },
    });

    return { success: true };
  }

  // ==================== 待分班学员 ====================

  /** 查询已付款但未分班的学员（含订单信息，按下单时间升序） */
  async findUnassignedStudents(courseId: string) {
    if (!courseId) throw new BadRequestException('courseId 为必填参数');

    // 1. 查已付款订单（含下单时间和金额）
    const paidOrders = await this.prisma.order.findMany({
      where: { courseId, status: 'paid' },
      select: { id: true, studentId: true, amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    if (paidOrders.length === 0) return [];

    // 去重，保留最早的订单
    const orderByStudent = new Map<string, (typeof paidOrders)[0]>();
    for (const o of paidOrders) {
      if (!orderByStudent.has(o.studentId)) {
        orderByStudent.set(o.studentId, o);
      }
    }
    const paidStudentIds = [...orderByStudent.keys()];

    // 2. 查该课程所有班级中已分配的 studentIds
    const classGroups = await this.prisma.classGroup.findMany({
      where: { courseId },
      select: { id: true },
    });
    const classGroupIds = classGroups.map((cg) => cg.id);

    let assignedStudentIds: string[] = [];
    if (classGroupIds.length > 0) {
      const assigned = await this.prisma.classGroupStudent.findMany({
        where: { classGroupId: { in: classGroupIds } },
        select: { studentId: true },
      });
      assignedStudentIds = assigned.map((a) => a.studentId);
    }

    // 3. 差集
    const unassignedIds = paidStudentIds.filter(
      (id) => !assignedStudentIds.includes(id),
    );
    if (unassignedIds.length === 0) return [];

    // 4. 查学员信息
    const students = await this.prisma.student.findMany({
      where: { id: { in: unassignedIds } },
      select: {
        id: true,
        userId: true,
        user: { select: { phone: true, nickname: true, avatar: true } },
      },
    });

    // 5. 合并订单信息，按下单时间排序返回
    return students
      .map((s) => {
        const order = orderByStudent.get(s.id);
        return {
          ...s,
          order: order
            ? { id: order.id, amount: order.amount.toString(), createdAt: order.createdAt.toISOString() }
            : null,
        };
      })
      .sort((a, b) => {
        const ta = a.order?.createdAt || '';
        const tb = b.order?.createdAt || '';
        return ta.localeCompare(tb);
      });
  }

  // ==================== 班级状态变更 ====================

  /** 状态流转顺序 */
  private static readonly STATUS_FLOW: ClassGroupStatus[] = [
    'forming',
    'scheduled',
    'active',
    'completed',
  ];

  /** 状态变更（含状态机校验 + 前置条件检查） */
  async changeStatus(id: string, targetStatus: ClassGroupStatus) {
    const classGroup = await this.prisma.classGroup.findUnique({
      where: { id },
      include: {
        course: { select: { totalHours: true, name: true } },
        schedules: {
          where: { status: { not: 'canceled' } },
          select: { startTime: true, endTime: true },
        },
        _count: { select: { students: true, schedules: true } },
      },
    });
    if (!classGroup) throw new NotFoundException('班级不存在');

    // 状态机校验：只允许正向流转一步
    const currentIdx = ClassGroupService.STATUS_FLOW.indexOf(classGroup.status);
    const targetIdx = ClassGroupService.STATUS_FLOW.indexOf(targetStatus);
    if (targetIdx < 0) {
      throw new BadRequestException(`无效的目标状态: ${targetStatus}`);
    }
    if (targetIdx !== currentIdx + 1) {
      throw new BadRequestException(
        `不允许从「${classGroup.status}」变更为「${targetStatus}」，只能按 forming → scheduled → active → completed 顺序流转`,
      );
    }

    // 前置条件检查
    if (targetStatus === 'scheduled') {
      if (classGroup._count.schedules === 0) {
        throw new BadRequestException('班级尚未排课，无法标记为「已排课」');
      }
      // 检查已排课时是否满足课程总课时
      const scheduledHours = classGroup.schedules.reduce((sum, s) => {
        return sum + (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60 * 60);
      }, 0);
      const totalHours = classGroup.course?.totalHours || 0;
      if (totalHours > 0 && scheduledHours < totalHours) {
        throw new BadRequestException(
          `已排课时 ${Math.round(scheduledHours * 10) / 10} 小时，未达到课程要求的 ${totalHours} 小时，请继续排课`,
        );
      }
    }
    if (targetStatus === 'active' && classGroup._count.students === 0) {
      throw new BadRequestException('班级尚无学员，无法标记为「开课中」');
    }

    const updated = await this.prisma.classGroup.update({
      where: { id },
      data: { status: targetStatus },
      include: {
        course: { select: { id: true, name: true } },
        _count: { select: { students: true, schedules: true } },
      },
    });

    // 操作日志
    console.log(
      `[ClassGroup] 状态变更: ${classGroup.name}(${id}) ${classGroup.status} → ${targetStatus}`,
    );

    // 发送通知（开课通知 / 结业通知）
    if (targetStatus === 'active' || targetStatus === 'completed') {
      const courseName = updated.course?.name || '课程';
      await this.sendStatusNotification(id, classGroup.name, courseName, targetStatus);
    }

    return updated;
  }

  // ==================== 优秀班级排名 ====================

  /** 获取本周优秀班级排名 */
  async getRanking(query: { categoryId?: string; courseId?: string }) {
    // 本周起始时间（周一 00:00）
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // 周一=0天差距
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    // 筛选条件
    const where: any = { status: 'active' };
    if (query.courseId) {
      where.courseId = query.courseId;
    } else if (query.categoryId) {
      where.course = { categoryId: Number(query.categoryId) };
    }

    // 查询所有 active 班级
    const classGroups = await this.prisma.classGroup.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            name: true,
            categoryId: true,
            category: { select: { name: true } },
          },
        },
        _count: { select: { students: true } },
      },
    });

    if (classGroups.length === 0) return [];

    // 批量查询本周数据
    const cgIds = classGroups.map((cg) => cg.id);

    // 本周各班级已完成排课数
    const schedules = await this.prisma.schedule.groupBy({
      by: ['classGroupId'],
      where: {
        classGroupId: { in: cgIds },
        startTime: { gte: weekStart, lte: now },
        status: { in: ['completed', 'ongoing'] },
      },
      _count: true,
    });
    const scheduleMap = new Map(schedules.map((s) => [s.classGroupId, s._count]));

    // 本周各班级打卡记录数
    const checkins = await this.prisma.checkinRecord.groupBy({
      by: ['scheduleId'],
      where: {
        schedule: {
          classGroupId: { in: cgIds },
          startTime: { gte: weekStart, lte: now },
        },
      },
      _count: true,
    });
    // 需要将 scheduleId 映射回 classGroupId
    const scheduleToClassGroup = await this.prisma.schedule.findMany({
      where: {
        classGroupId: { in: cgIds },
        startTime: { gte: weekStart, lte: now },
      },
      select: { id: true, classGroupId: true },
    });
    const s2cg = new Map(scheduleToClassGroup.map((s) => [s.id, s.classGroupId]));
    const checkinCountMap = new Map<string, number>();
    for (const c of checkins) {
      const cgId = s2cg.get(c.scheduleId);
      if (cgId) {
        checkinCountMap.set(cgId, (checkinCountMap.get(cgId) || 0) + c._count);
      }
    }

    // 本周各班级笔记数
    const notes = await this.prisma.note.groupBy({
      by: ['classGroupId'],
      where: {
        classGroupId: { in: cgIds },
        createdAt: { gte: weekStart, lte: now },
      },
      _count: true,
    });
    const noteMap = new Map(notes.map((n) => [n.classGroupId, n._count]));

    // 计算每个班级的综合评分
    const ranked = classGroups.map((cg: any) => {
      const studentCount = cg._count.students;
      const scheduleCount = scheduleMap.get(cg.id) || 0;
      const checkinCount = checkinCountMap.get(cg.id) || 0;
      const noteCount = noteMap.get(cg.id) || 0;

      // 打卡率 = 打卡数 / (排课数 * 学员数)
      const denominator = scheduleCount * studentCount;
      const checkinRate = denominator > 0 ? checkinCount / denominator : 0;

      // 综合评分 = 打卡率 * 60 + min(笔记数, 50) * 0.8
      const score = checkinRate * 60 + Math.min(noteCount, 50) * 0.8;

      return {
        id: cg.id,
        name: cg.name,
        courseName: cg.course?.name || '',
        categoryId: cg.course?.categoryId,
        categoryName: cg.course?.category?.name || '',
        studentCount,
        checkinRate: Math.round(checkinRate * 100),
        checkinRateText: Math.round(checkinRate * 100) + '%',
        noteCount,
        score: Math.round(score * 100) / 100,
      };
    });

    // 排序取前10
    ranked.sort((a, b) => b.score - a.score);
    return ranked.slice(0, 10);
  }

  // ==================== 工具方法 ====================

  private async ensureExists(id: string) {
    const classGroup = await this.prisma.classGroup.findUnique({
      where: { id },
    });
    if (!classGroup) throw new NotFoundException('班级不存在');
    return classGroup;
  }

  // ==================== 学员端 API ====================

  /** 我的班级列表 */
  async findMyClassGroups(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) return [];

    const memberships = await this.prisma.classGroupStudent.findMany({
      where: { studentId: student.id },
      include: {
        classGroup: {
          include: {
            course: { select: { id: true, name: true, coverImage: true } },
            _count: { select: { students: true, schedules: true } },
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.classGroup,
      studentCount: (m.classGroup as any)._count.students,
      scheduleCount: (m.classGroup as any)._count.schedules,
      enrolledAt: m.enrolledAt,
    }));
  }

  /** 学员端班级详情 */
  async findStudentClassGroupDetail(classGroupId: string, userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new ForbiddenException('非学员');

    const membership = await this.prisma.classGroupStudent.findUnique({
      where: { classGroupId_studentId: { classGroupId, studentId: student.id } },
    });
    if (!membership) throw new ForbiddenException('非本班成员');

    const classGroup = await this.prisma.classGroup.findUnique({
      where: { id: classGroupId },
      include: {
        course: { select: { id: true, name: true, coverImage: true, totalHours: true } },
        _count: { select: { students: true, schedules: true } },
      },
    });
    if (!classGroup) throw new NotFoundException('班级不存在');

    // 下一次排课
    const nextSchedule = await this.prisma.schedule.findFirst({
      where: {
        classGroupId,
        startTime: { gte: new Date() },
        status: { not: 'canceled' },
      },
      orderBy: { startTime: 'asc' },
      select: { id: true, startTime: true, endTime: true },
    });

    return { ...classGroup, nextSchedule };
  }

  /** 班级同学列表 */
  async findClassmates(classGroupId: string, userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new ForbiddenException('非学员');

    const membership = await this.prisma.classGroupStudent.findUnique({
      where: { classGroupId_studentId: { classGroupId, studentId: student.id } },
    });
    if (!membership) throw new ForbiddenException('非本班成员');

    const classmates = await this.prisma.classGroupStudent.findMany({
      where: { classGroupId },
      include: {
        student: {
          select: {
            id: true,
            userId: true,
            user: { select: { id: true, nickname: true, avatar: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'asc' },
    });

    return classmates.map((c) => ({
      studentId: c.student.id,
      userId: c.student.userId,
      nickname: c.student.user.nickname,
      avatar: c.student.user.avatar,
      enrolledAt: c.enrolledAt,
    }));
  }

  /** 班级完整课表（学员端） */
  async findClassGroupSchedules(classGroupId: string, userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new ForbiddenException('非学员');

    const membership = await this.prisma.classGroupStudent.findUnique({
      where: { classGroupId_studentId: { classGroupId, studentId: student.id } },
    });
    if (!membership) throw new ForbiddenException('非本班成员');

    return this.prisma.schedule.findMany({
      where: { classGroupId, status: { not: 'canceled' } },
      include: {
        course: { select: { id: true, name: true } },
        teacher: { select: { id: true, realName: true } },
        classroom: {
          select: {
            id: true,
            name: true,
            venue: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
