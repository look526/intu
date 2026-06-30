import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourseCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.courseCategory.findMany({
      orderBy: { priority: 'asc' },
      include: { _count: { select: { courses: true } } },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.courseCategory.findUnique({
      where: { id },
      include: { _count: { select: { courses: true } } },
    });
    if (!category) {
      throw new NotFoundException(`分类 #${id} 不存在`);
    }
    return category;
  }

  async create(data: { name: string; icon?: string; priority?: number }) {
    return this.prisma.courseCategory.create({ data });
  }

  async update(
    id: number,
    data: { name?: string; icon?: string; priority?: number },
  ) {
    await this.findOne(id);
    return this.prisma.courseCategory.update({ where: { id }, data });
  }

  async remove(id: number) {
    const category = await this.findOne(id);
    if (category._count.courses > 0) {
      throw new BadRequestException(
        `分类「${category.name}」下有 ${category._count.courses} 门课程，无法删除`,
      );
    }
    return this.prisma.courseCategory.delete({ where: { id } });
  }

  async updatePriority(items: { id: number; priority: number }[]) {
    const ops = items.map((item) =>
      this.prisma.courseCategory.update({
        where: { id: item.id },
        data: { priority: item.priority },
      }),
    );
    await this.prisma.$transaction(ops);
    return { success: true };
  }
}
