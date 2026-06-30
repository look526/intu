import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class CheckinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Haversine 公式计算两点距离（米）
   */
  private haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000; // 地球半径（米）
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 打卡
   */
  async checkin(
    userId: string,
    scheduleId: string,
    latitude: number,
    longitude: number,
  ) {
    // 1. 找到学员
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    if (!student) {
      throw new NotFoundException('学员信息不存在，请先完成注册');
    }

    // 2. 找到排课（含教室 -> 场地坐标）
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        classroom: {
          include: {
            venue: { select: { latitude: true, longitude: true, name: true } },
          },
        },
        course: { select: { name: true } },
      },
    });
    if (!schedule) {
      throw new NotFoundException('排课不存在');
    }

    // 3. 检查排课状态
    if (schedule.status === 'canceled' || schedule.status === 'completed') {
      throw new BadRequestException('该排课已取消或已结束，无法打卡');
    }

    // 3.5 检查打卡时间窗口：上课开始后1小时内
    const now = new Date();
    const deadline = new Date(schedule.startTime);
    deadline.setHours(deadline.getHours() + 1);
    if (now > deadline) {
      throw new BadRequestException('已超过打卡时间（上课后1小时内），无法打卡');
    }

    // 4. 防重复打卡
    const existing = await this.prisma.checkinRecord.findFirst({
      where: { studentId: student.id, scheduleId },
    });
    if (existing) {
      throw new BadRequestException('您已打过卡，请勿重复打卡');
    }

    // 5. 计算距离
    const venueLat = Number(schedule.classroom.venue.latitude);
    const venueLng = Number(schedule.classroom.venue.longitude);
    const distance = this.haversineDistance(
      latitude,
      longitude,
      venueLat,
      venueLng,
    );
    const locationValid = distance <= 500;
    const creditEarned = locationValid ? 1 : 0;

    // 6. 创建打卡记录
    await this.prisma.checkinRecord.create({
      data: {
        student: { connect: { id: student.id } },
        schedule: { connect: { id: scheduleId } },
        locationValid,
        creditEarned,
      },
    });

    // 7. 若有效，学分 +1
    if (locationValid) {
      await this.prisma.student.update({
        where: { id: student.id },
        data: { credits: { increment: 1 } },
      });
    }

    // 8. 发送打卡通知
    this.sendCheckinNotification(userId, schedule.course.name, creditEarned, locationValid);

    return {
      success: true,
      locationValid,
      creditEarned,
      distance: Math.round(distance),
    };
  }

  /**
   * 打卡后发送通知（仅有效打卡时）
   */
  private sendCheckinNotification(
    userId: string,
    courseName: string,
    creditEarned: number,
    locationValid: boolean,
  ) {
    if (!locationValid) return;
    this.notificationService.notify(
      userId,
      'checkin_success',
      '打卡成功',
      `「${courseName}」打卡成功，获得 ${creditEarned} 学分`,
      { targetUrl: '/pages/credits/index' },
    );
  }

  /**
   * 查询学员学分
   */
  async getMyCredits(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { credits: true },
    });
    return { credits: student?.credits ?? 0 };
  }

  /**
   * 查询打卡历史记录
   */
  async getMyRecords(userId: string, page = 1, pageSize = 20) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    if (!student) return { items: [], total: 0, page, pageSize };

    const where = { studentId: student.id };
    const [items, total] = await Promise.all([
      this.prisma.checkinRecord.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { checkinTime: 'desc' },
        include: {
          schedule: {
            include: {
              course: { select: { id: true, name: true } },
              classroom: {
                select: {
                  id: true,
                  name: true,
                  venue: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.checkinRecord.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  // ==================== 打卡页面接口 ====================

  /** 获取排课地点信息（地图打卡页面用） */
  async getScheduleLocation(scheduleId: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        course: { select: { name: true } },
        classroom: {
          select: {
            name: true,
            venue: { select: { name: true, latitude: true, longitude: true, address: true } },
          },
        },
        teacher: { select: { realName: true } },
      },
    });
    if (!schedule) throw new NotFoundException('排课不存在');
    // 判断是否超过打卡截止时间（上课开始后1小时）
    const now = new Date();
    const deadline = new Date(schedule.startTime);
    deadline.setHours(deadline.getHours() + 1);
    const expired = now > deadline;
    return {
      scheduleId: schedule.id,
      courseName: schedule.course.name,
      classroomName: schedule.classroom.name,
      venueName: schedule.classroom.venue.name,
      venueAddress: schedule.classroom.venue.address,
      teacherName: schedule.teacher?.realName || '',
      latitude: Number(schedule.classroom.venue.latitude),
      longitude: Number(schedule.classroom.venue.longitude),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      expired,
    };
  }

  // ==================== 管理员接口 ====================

  /** 管理员打卡记录列表 */
  async adminFindAll(query: {
    page?: number;
    pageSize?: number;
    courseId?: string;
    keyword?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: any = {};

    if (query.courseId) {
      where.schedule = { courseId: query.courseId };
    }
    if (query.keyword) {
      where.student = {
        user: {
          OR: [
            { nickname: { contains: query.keyword } },
            { phone: { contains: query.keyword } },
          ],
        },
      };
    }
    if (query.startDate || query.endDate) {
      where.checkinTime = {};
      if (query.startDate) where.checkinTime.gte = new Date(query.startDate);
      if (query.endDate) where.checkinTime.lte = new Date(query.endDate + 'T23:59:59');
    }

    const [items, total] = await Promise.all([
      this.prisma.checkinRecord.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { checkinTime: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              user: { select: { nickname: true, avatar: true } },
            },
          },
          schedule: {
            include: {
              course: { select: { id: true, name: true } },
              classroom: {
                select: {
                  name: true,
                  venue: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.checkinRecord.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
