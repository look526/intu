import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** 微信登录用户 phone 为 wx_ 前缀假号码，统一过滤 */
function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone || phone.startsWith('wx_')) return null;
  return phone;
}

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

  /** 首页优秀教师列表 */
  async findFeatured() {
    const teachers = await this.prisma.teacher.findMany({
      where: { isRecommended: true, status: 'active' },
      include: {
        user: { select: { nickname: true, avatar: true } },
        courses: {
          where: { status: 'published' },
          select: { name: true },
          take: 2,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { courses: true } },
      },
      orderBy: { rating: 'desc' },
      take: 10,
    });

    return teachers.map((t: any) => ({
      id: t.id,
      realName: t.realName,
      avatar: t.user?.avatar || '',
      bio: t.bio || '',
      specialties: t.specialties || '',
      rating: Number(t.rating),
      reviewCount: t.reviewCount,
      courseCount: t._count.courses,
      topCourseNames: t.courses.map((c: any) => c.name).join('、'),
    }));
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    trainingStatus?: string;
    status?: string;
    keyword?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.trainingStatus) {
      where.trainingStatus = query.trainingStatus;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.keyword) {
      where.OR = [
        { realName: { contains: query.keyword } },
        { specialties: { contains: query.keyword } },
      ];
    }

    const [rawItems, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          user: { select: { phone: true, avatar: true } },
          _count: { select: { courses: true, schedules: true } },
        },
        orderBy: { rating: 'desc' },
      }),
      this.prisma.teacher.count({ where }),
    ]);

    const items = rawItems.map((t: any) => ({
      ...t,
      user: t.user ? { ...t.user, phone: sanitizePhone(t.user.phone) } : t.user,
    }));

    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        user: { select: { phone: true, nickname: true, avatar: true } },
        courses: {
          where: { status: 'published' },
          select: {
            id: true,
            name: true,
            coverImage: true,
            status: true,
            totalHours: true,
            description: true,
            category: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { courses: true, schedules: true } },
      },
    });

    if (!teacher) {
      throw new NotFoundException('教师不存在');
    }

    // 关联查询教师申请数据（获取作品集、视频、教学年限）
    const application = await this.prisma.teacherApplication.findFirst({
      where: { userId: teacher.userId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
      select: {
        portfolioUrls: true,
        introVideoUrl: true,
        teachingYears: true,
      },
    });

    return {
      ...teacher,
      user: teacher.user
        ? { ...teacher.user, phone: sanitizePhone(teacher.user.phone) }
        : teacher.user,
      avatarUrl: teacher.user?.avatar || '',
      portfolioUrls: application?.portfolioUrls || [],
      introVideoUrl: application?.introVideoUrl || '',
      teachingYears: application?.teachingYears || 0,
      courseCount: teacher._count.courses,
      scheduleCount: teacher._count.schedules,
    };
  }

  async create(data: {
    userId: string;
    realName: string;
    bio?: string;
    specialties?: string;
    certificateUrls?: any;
  }) {
    // 检查 userId 是否已有教师记录
    const existing = await this.prisma.teacher.findUnique({
      where: { userId: data.userId },
    });
    if (existing) {
      throw new BadRequestException('该用户已有教师档案');
    }

    const { randomUUID } = await import('crypto');
    return this.prisma.teacher.create({
      data: {
        id: randomUUID(),
        ...data,
      },
    });
  }

  async update(
    id: string,
    data: {
      realName?: string;
      bio?: string;
      specialties?: string;
      certificateUrls?: any;
      avatarUrl?: string;
      phone?: string;
    },
  ) {
    const teacher = await this.ensureExists(id);

    // 分离 User 表字段和 Teacher 表字段
    const { avatarUrl, phone, ...teacherData } = data;

    // 更新 User 表的头像和手机号
    if (avatarUrl !== undefined || phone !== undefined) {
      const userData: any = {};
      if (avatarUrl !== undefined) userData.avatar = avatarUrl;
      if (phone !== undefined) userData.phone = phone;
      await this.prisma.user.update({ where: { id: teacher.userId }, data: userData });
    }

    // 更新 Teacher 表字段
    if (Object.keys(teacherData).length > 0) {
      return this.prisma.teacher.update({ where: { id }, data: teacherData });
    }

    return this.prisma.teacher.findUnique({ where: { id } });
  }

  async updateTrainingStatus(
    id: string,
    trainingStatus: 'pending' | 'passed' | 'failed',
  ) {
    await this.ensureExists(id);
    const updateData: any = { trainingStatus };
    if (trainingStatus === 'passed' || trainingStatus === 'failed') {
      updateData.trainingDate = new Date();
    }
    return this.prisma.teacher.update({ where: { id }, data: updateData });
  }

  async updateStatus(id: string, status: 'active' | 'frozen') {
    await this.ensureExists(id);
    return this.prisma.teacher.update({ where: { id }, data: { status } });
  }

  async toggleRecommend(id: string) {
    const teacher = await this.ensureExists(id);
    return this.prisma.teacher.update({
      where: { id },
      data: { isRecommended: !teacher.isRecommended },
    });
  }

  private async ensureExists(id: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) {
      throw new NotFoundException('教师不存在');
    }
    return teacher;
  }
}
