import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: { type: string; content: string; images?: string[]; contact?: string }) {
    return this.prisma.feedback.create({
      data: {
        userId,
        type: data.type,
        content: data.content,
        images: data.images || [],
        contact: data.contact || null,
      },
    });
  }

  async findAll(query: { page?: number; pageSize?: number; status?: string }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const where: Record<string, unknown> = {};
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, phone: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async reply(id: string, replyContent: string) {
    return this.prisma.feedback.update({
      where: { id },
      data: { reply: replyContent, status: 'replied' },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.feedback.update({
      where: { id },
      data: { status },
    });
  }
}
