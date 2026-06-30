import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

/** 过滤微信登录产生的 wx_ 前缀假号码 */
function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone || phone.startsWith('wx_')) return null;
  return phone;
}

@Injectable()
export class VenueApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /** 提交申请 */
  async submit(
    userId: string,
    data: {
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      trafficInfo?: string;
      area?: number;
      photos?: string[];
    },
  ) {
    // 检查是否有待审核申请
    const pendingApp = await this.prisma.venueApplication.findFirst({
      where: { userId, status: 'pending' },
    });
    if (pendingApp) {
      throw new BadRequestException('您有一条待审核的申请，请耐心等待');
    }

    return this.prisma.venueApplication.create({
      data: {
        userId,
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        trafficInfo: data.trafficInfo || null,
        area: data.area ? Number(data.area) : null,
        photos: data.photos || [],
      },
    });
  }

  /** 查询我的最新申请 */
  async findMyLatest(userId: string) {
    return this.prisma.venueApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 管理端：分页列表 */
  async findAll(query: { status?: string; page?: number; pageSize?: number }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.venueApplication.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          user: { select: { phone: true, nickname: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.venueApplication.count({ where }),
    ]);

    const sanitizedItems = items.map((t: any) => ({
      ...t,
      user: t.user ? { ...t.user, phone: sanitizePhone(t.user.phone) } : t.user,
    }));

    return { items: sanitizedItems, total, page, pageSize };
  }

  /** 管理端：详情 */
  async findOne(id: string) {
    const app = await this.prisma.venueApplication.findUnique({
      where: { id },
      include: {
        user: { select: { phone: true, nickname: true, avatar: true } },
      },
    });
    if (!app) throw new NotFoundException('申请不存在');
    return {
      ...app,
      user: app.user ? { ...app.user, phone: sanitizePhone(app.user.phone) } : app.user,
    };
  }

  /** 管理端：审核 */
  async audit(
    id: string,
    data: { status: 'approved' | 'rejected'; auditRemark?: string },
  ) {
    const app = await this.prisma.venueApplication.findUnique({
      where: { id },
    });
    if (!app) throw new NotFoundException('申请不存在');
    if (app.status !== 'pending') {
      throw new BadRequestException('该申请已审核，不可重复操作');
    }

    // 更新申请状态
    const updated = await this.prisma.venueApplication.update({
      where: { id },
      data: {
        status: data.status,
        auditRemark: data.auditRemark || null,
      },
    });

    // 通过 -> 自动创建场地记录（待线下考察）
    if (data.status === 'approved') {
      await this.prisma.venue.create({
        data: {
          ownerId: app.userId,
          name: app.name,
          address: app.address,
          latitude: app.latitude,
          longitude: app.longitude,
          trafficInfo: app.trafficInfo,
          area: app.area,
          photos: app.photos as any,
          status: 'pending', // VenueStatus.pending — 待线下考察
        },
      });
    }

    // 发送审核结果通知
    const statusText = data.status === 'approved' ? '已通过' : '未通过';
    this.notificationService.notify(
      app.userId,
      'venue_application_result',
      `场地申请审核${statusText}`,
      data.status === 'approved'
        ? `恭喜，您的场地「${app.name}」已通过审核，进入待考察阶段`
        : `您的场地申请未通过，${data.auditRemark || '请重新提交'}`,
      { targetUrl: '/pages/apply/venue/index' },
    );

    return updated;
  }
}
