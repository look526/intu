import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  /** 提交课后评价 */
  async create(
    userId: string,
    data: { scheduleId: string; rating: number; content?: string },
  ) {
    // 1. 查学员
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    if (!student) throw new NotFoundException('学员信息不存在');

    // 2. 查排课（含课程→老师）
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: data.scheduleId },
      include: {
        course: { select: { id: true, name: true, teacherId: true } },
      },
    });
    if (!schedule) throw new NotFoundException('排课不存在');

    // 3. 检查是否已打卡
    const checkin = await this.prisma.checkinRecord.findFirst({
      where: { studentId: student.id, scheduleId: data.scheduleId },
    });
    if (!checkin) {
      throw new BadRequestException('您尚未打卡，需先完成打卡才能评价');
    }

    // 4. 创建评价（唯一约束防重复）
    try {
      const review = await this.prisma.courseReview.create({
        data: {
          student: { connect: { id: student.id } },
          schedule: { connect: { id: data.scheduleId } },
          rating: Math.min(5, Math.max(1, data.rating || 5)),
          content: data.content || null,
        },
      });

      // 5. 更新教师评分
      if (schedule.course.teacherId) {
        await this.updateTeacherRating(schedule.course.teacherId);
      }

      return review;
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('您已对该课程提交过评价');
      }
      throw e;
    }
  }

  /** 更新教师综合评分 */
  private async updateTeacherRating(teacherId: string) {
    // 查该教师所有排课的评价平均分和总数
    const result = await this.prisma.courseReview.aggregate({
      where: {
        schedule: { course: { teacherId } },
      },
      _avg: { rating: true },
      _count: { id: true },
    });

    const avgRating = result._avg.rating ?? 0;
    const reviewCount = result._count.id;

    await this.prisma.teacher.update({
      where: { id: teacherId },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        reviewCount,
      },
    });
  }

  /** 评价列表（管理端，支持筛选） */
  async findAll(query: {
    courseId?: string;
    teacherId?: string;
    studentId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: any = {};

    if (query.courseId) {
      where.schedule = { ...where.schedule, courseId: query.courseId };
    }
    if (query.teacherId) {
      where.schedule = {
        ...where.schedule,
        course: { teacherId: query.teacherId },
      };
    }
    if (query.studentId) {
      where.studentId = query.studentId;
    }

    const [items, total] = await Promise.all([
      this.prisma.courseReview.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              user: { select: { nickname: true, avatar: true } },
            },
          },
          schedule: {
            select: {
              id: true,
              startTime: true,
              course: { select: { id: true, name: true } },
              teacher: { select: { id: true, realName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.courseReview.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 我的评价列表（学员端） */
  async findMy(userId: string, page = 1, pageSize = 20) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    if (!student) return { items: [], total: 0, page, pageSize };

    const where = { studentId: student.id };
    const [items, total] = await Promise.all([
      this.prisma.courseReview.findMany({
        where,
        include: {
          schedule: {
            select: {
              id: true,
              startTime: true,
              course: { select: { id: true, name: true } },
              teacher: { select: { id: true, realName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.courseReview.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 检查某排课是否已评价（学员端） */
  async checkBySchedule(userId: string, scheduleId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    if (!student) return { reviewed: false };

    const review = await this.prisma.courseReview.findUnique({
      where: {
        studentId_scheduleId: {
          studentId: student.id,
          scheduleId,
        },
      },
    });

    return { reviewed: !!review, review: review || undefined };
  }
}
