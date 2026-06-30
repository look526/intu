import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrialBookingService {
  constructor(private prisma: PrismaService) {}

  /** 创建试听预约 */
  async create(dto: {
    courseId: string;
    userId?: string;
    name: string;
    phone: string;
    preferDate?: string;
  }) {
    let { name, phone, userId } = dto;

    // 已登录用户：从数据库查询真实昵称和手机号
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { nickname: true, phone: true },
      });
      if (user) {
        name = user.nickname || name;
        phone = user.phone || phone;
      }
    }

    return this.prisma.trialBooking.create({
      data: {
        courseId: dto.courseId,
        userId: userId || null,
        name,
        phone,
        preferDate: dto.preferDate ? new Date(dto.preferDate) : null,
      },
    });
  }

  /** 用户端 - 我的试听预约列表 */
  async findMy(
    userId: string,
    query: { page?: number; pageSize?: number },
  ) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where = { userId };

    const [items, total] = await Promise.all([
      this.prisma.trialBooking.findMany({
        where,
        include: {
          course: { select: { id: true, name: true, coverImage: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.trialBooking.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 管理员 - 分页列表 */
  async findAll(query: {
    page?: number;
    pageSize?: number;
    status?: string;
    courseId?: string;
    keyword?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: any = {};

    if (query.status) where.status = query.status;
    if (query.courseId) where.courseId = query.courseId;
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { phone: { contains: query.keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.trialBooking.findMany({
        where,
        include: {
          course: { select: { id: true, name: true } },
          user: { select: { id: true, nickname: true, avatar: true } },
          _count: { select: { followUps: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.trialBooking.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 管理员 - 详情（含跟进记录） */
  async findOne(id: string) {
    return this.prisma.trialBooking.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, name: true, coverImage: true } },
        user: { select: { id: true, nickname: true, avatar: true, phone: true } },
        followUps: {
          include: {
            admin: { select: { id: true, nickname: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /** 管理员 - 更新状态 */
  async updateStatus(id: string, status: string, remark?: string) {
    return this.prisma.trialBooking.update({
      where: { id },
      data: { status: status as any, remark },
    });
  }

  /** 管理员 - 添加跟进记录 */
  async addFollowUp(trialBookingId: string, adminId: string, content: string) {
    return this.prisma.trialFollowUp.create({
      data: { trialBookingId, adminId, content },
    });
  }
}
