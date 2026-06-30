import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** 微信登录用户 phone 为 wx_ 前缀假号码，统一过滤 */
function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone || phone.startsWith('wx_')) return null;
  return phone;
}

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  /** 学员列表（管理员用） */
  async findAll(query: {
    page?: number;
    pageSize?: number;
    keyword?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.keyword) {
      where.user = {
        OR: [
          { nickname: { contains: query.keyword } },
          { phone: { contains: query.keyword } },
        ],
      };
    }

    const [rawItems, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          user: { select: { nickname: true, avatar: true, phone: true } },
          _count: {
            select: {
              orders: true,
              classGroupStudents: true,
              checkinRecords: true,
              notes: true,
            },
          },
        },
        orderBy: { user: { createdAt: 'desc' } },
      }),
      this.prisma.student.count({ where }),
    ]);

    const items = rawItems.map((s: any) => ({
      ...s,
      user: s.user
        ? { ...s.user, phone: sanitizePhone(s.user.phone) }
        : s.user,
    }));

    return { items, total, page, pageSize };
  }

  /** 用户搜索（手机号/昵称，供场地主选择等场景） */
  async searchUsers(keyword: string) {
    if (!keyword || !keyword.trim()) return [];
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { nickname: { contains: keyword.trim() } },
          { phone: { contains: keyword.trim() } },
        ],
      },
      select: { id: true, nickname: true, phone: true, avatar: true },
      take: 20,
    });
    return users.map((u) => ({
      ...u,
      phone: sanitizePhone(u.phone),
    }));
  }

  /** 学员详情（管理员用） */
  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: { nickname: true, avatar: true, phone: true, createdAt: true } },
        orders: {
          include: {
            course: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        classGroupStudents: {
          include: {
            classGroup: {
              select: { id: true, name: true, status: true, course: { select: { name: true } } },
            },
          },
        },
        _count: {
          select: {
            orders: true,
            classGroupStudents: true,
            checkinRecords: true,
            notes: true,
            courseReviews: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('学员不存在');
    }

    return {
      ...student,
      user: student.user
        ? { ...student.user, phone: sanitizePhone(student.user.phone) }
        : student.user,
    };
  }
}
