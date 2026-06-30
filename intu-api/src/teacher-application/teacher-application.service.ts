import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherService } from '../teacher/teacher.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class TeacherApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherService: TeacherService,
    private readonly notificationService: NotificationService,
  ) {}

  /** 提交申请 */
  async submit(
    userId: string,
    data: {
      realName: string;
      phone: string;
      specialties: string;
      teachingYears: number;
      bio?: string;
      avatarUrl?: string;
      certificateUrls?: string[];
      portfolioUrls?: string[];
      introVideoUrl?: string;
    },
  ) {
    // 检查是否已是老师
    const existingTeacher = await this.prisma.teacher.findUnique({
      where: { userId },
    });
    if (existingTeacher) {
      throw new BadRequestException('您已是老师，无需重复申请');
    }

    // 检查是否有待审核申请
    const pendingApp = await this.prisma.teacherApplication.findFirst({
      where: { userId, status: 'pending' },
    });
    if (pendingApp) {
      throw new BadRequestException('您有一条待审核的申请，请耐心等待');
    }

    return this.prisma.teacherApplication.create({
      data: {
        userId,
        realName: data.realName,
        phone: data.phone,
        specialties: data.specialties,
        teachingYears: Number(data.teachingYears) || 0,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        certificateUrls: data.certificateUrls || [],
        portfolioUrls: data.portfolioUrls || [],
        introVideoUrl: data.introVideoUrl,
      },
    });
  }

  /** 查询我的最新申请 */
  async findMyLatest(userId: string) {
    const app = await this.prisma.teacherApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return app || null;
  }

  /** 管理端：申请列表 */
  async findAll(query: {
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.teacherApplication.findMany({
        where,
        include: {
          user: {
            select: { nickname: true, phone: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.teacherApplication.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 管理端：申请详情 */
  async findOne(id: string) {
    const app = await this.prisma.teacherApplication.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, nickname: true, phone: true, avatar: true },
        },
      },
    });
    if (!app) throw new NotFoundException('申请不存在');
    return app;
  }

  /** 管理端：审核 */
  async audit(
    id: string,
    data: { status: 'approved' | 'rejected'; auditRemark?: string },
  ) {
    const app = await this.prisma.teacherApplication.findUnique({
      where: { id },
    });
    if (!app) throw new NotFoundException('申请不存在');
    if (app.status !== 'pending') {
      throw new BadRequestException('该申请已审核，不可重复操作');
    }

    // 更新申请状态
    const updated = await this.prisma.teacherApplication.update({
      where: { id },
      data: {
        status: data.status,
        auditRemark: data.auditRemark || null,
      },
    });

    // 通过 -> 自动创建老师档案 + 更新用户角色
    if (data.status === 'approved') {
      await this.teacherService.create({
        userId: app.userId,
        realName: app.realName,
        bio: app.bio || undefined,
        specialties: app.specialties || undefined,
        certificateUrls: app.certificateUrls,
      });

      await this.prisma.user.update({
        where: { id: app.userId },
        data: {
          role: 'teacher',
          // 将申请时的形象照同步到 User.avatar，作为统一头像源
          ...(app.avatarUrl ? { avatar: app.avatarUrl } : {}),
        },
      });
    }

    // 发送审核结果通知
    const statusText = data.status === 'approved' ? '已通过' : '未通过';
    this.notificationService.notify(
      app.userId,
      'teacher_application_result',
      `老师申请审核${statusText}`,
      data.status === 'approved'
        ? '恭喜，您的老师申请已通过审核！'
        : `您的老师申请未通过，${data.auditRemark || '请重新提交'}`,
      { targetUrl: '/pages/apply/teacher/index' },
    );

    return updated;
  }
}
