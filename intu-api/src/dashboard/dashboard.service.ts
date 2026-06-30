import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      studentCount,
      teacherCount,
      courseCount,
      revenueResult,
      pendingOrders,
      pendingTeacherApps,
      pendingVenueApps,
      pendingTrialBookings,
      todaySchedules,
      recentOrders,
    ] = await Promise.all([
      // 核心指标
      this.prisma.student.count(),
      this.prisma.teacher.count({ where: { status: 'active' } }),
      this.prisma.course.count({ where: { status: 'published' } }),
      this.prisma.order.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true },
      }),

      // 待办事项
      this.prisma.order.count({ where: { status: 'pending' } }),
      this.prisma.teacherApplication.count({ where: { status: 'pending' } }),
      this.prisma.venueApplication.count({ where: { status: 'pending' } }),
      this.prisma.trialBooking.count({ where: { status: 'pending' } }),

      // 今日排课
      this.prisma.schedule.findMany({
        where: {
          startTime: { gte: todayStart, lte: todayEnd },
        },
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
          classGroup: { select: { id: true, name: true } },
        },
        orderBy: { startTime: 'asc' },
        take: 10,
      }),

      // 近期订单
      this.prisma.order.findMany({
        include: {
          student: {
            select: {
              id: true,
              user: { select: { nickname: true, phone: true } },
            },
          },
          course: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // 为每条排课计算「第X节/共N节」
    const enrichedSchedules = await Promise.all(
      todaySchedules.map(async (s) => {
        const groupKey = s.classGroupId || s.courseId;
        const isGroup = !!s.classGroupId;
        const where = isGroup
          ? { classGroupId: groupKey }
          : { courseId: groupKey, classGroupId: null };

        const [totalLessons, lessonNumber] = await Promise.all([
          this.prisma.schedule.count({ where }),
          this.prisma.schedule.count({
            where: { ...where, startTime: { lt: s.startTime } },
          }),
        ]);

        return { ...s, lessonNumber: lessonNumber + 1, totalLessons };
      }),
    );

    return {
      stats: {
        studentCount,
        teacherCount,
        courseCount,
        totalRevenue: Number(revenueResult._sum.amount || 0),
      },
      pending: {
        orders: pendingOrders,
        teacherApplications: pendingTeacherApps,
        venueApplications: pendingVenueApps,
        trialBookings: pendingTrialBookings,
      },
      todaySchedules: enrichedSchedules,
      recentOrders,
    };
  }
}
