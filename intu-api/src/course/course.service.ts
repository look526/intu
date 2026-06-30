import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CourseStatus } from '@prisma/client';

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    pageSize?: number;
    categoryId?: number;
    status?: string;
    keyword?: string;
  }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const where: any = {};

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.status) {
      where.status = query.status as CourseStatus;
    }
    if (query.keyword) {
      where.name = { contains: query.keyword };
    }

    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, icon: true } },
          teacher: { select: { id: true, realName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.course.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        teacher: {
          select: {
            id: true,
            realName: true,
            bio: true,
            specialties: true,
            rating: true,
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException(`课程不存在`);
    }
    return course;
  }

  async create(data: {
    name: string;
    categoryId: number;
    teacherId: string;
    coverImage?: string;
    description?: string;
    totalHours?: number;
    price?: number;
    isRecommended?: boolean;
  }) {
    return this.prisma.course.create({ data });
  }

  async update(
    id: string,
    data: {
      name?: string;
      categoryId?: number;
      teacherId?: string;
      coverImage?: string;
      description?: string;
      totalHours?: number;
      price?: number;
      isRecommended?: boolean;
    },
  ) {
    await this.findOne(id);
    return this.prisma.course.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: CourseStatus) {
    await this.findOne(id);
    return this.prisma.course.update({
      where: { id },
      data: { status },
    });
  }

  async toggleRecommend(id: string) {
    const course = await this.findOne(id);
    return this.prisma.course.update({
      where: { id },
      data: { isRecommended: !course.isRecommended },
    });
  }

  async findRecommended() {
    return this.prisma.course.findMany({
      where: { isRecommended: true, status: 'published' },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        teacher: { select: { id: true, realName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }
}
