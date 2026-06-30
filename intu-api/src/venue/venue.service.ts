import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VenueService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== 场地 ====================

  async findAll(query: {
    page?: number;
    pageSize?: number;
    status?: string;
    keyword?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { address: { contains: query.keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          owner: { select: { phone: true, nickname: true } },
          _count: { select: { classrooms: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.venue.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        owner: { select: { phone: true, nickname: true } },
        classrooms: { orderBy: { name: 'asc' } },
      },
    });
    if (!venue) throw new NotFoundException('场地不存在');
    return venue;
  }

  async create(data: {
    ownerId?: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    trafficInfo?: string;
    area?: number;
    photos?: any;
  }) {
    return this.prisma.venue.create({ data: data as any });
  }

  async update(
    id: string,
    data: {
      name?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      trafficInfo?: string;
      area?: number;
      photos?: any;
    },
  ) {
    await this.ensureExists(id);
    return this.prisma.venue.update({ where: { id }, data: data as any });
  }

  async audit(id: string, status: 'approved' | 'rejected', auditRemark?: string) {
    const venue = await this.ensureExists(id);
    if (venue.status !== 'pending') {
      throw new BadRequestException('只能审核待审核状态的场地');
    }
    return this.prisma.venue.update({
      where: { id },
      data: { status, auditRemark: auditRemark || null },
    });
  }

  async updateStatus(id: string, status: 'approved' | 'offline') {
    const venue = await this.ensureExists(id);
    if (status === 'offline' && venue.status !== 'approved') {
      throw new BadRequestException('只能下线已通过的场地');
    }
    if (status === 'approved' && venue.status !== 'offline') {
      throw new BadRequestException('只能上线已下线的场地');
    }
    return this.prisma.venue.update({ where: { id }, data: { status } });
  }

  async markSiteVisit(id: string, note?: string) {
    await this.ensureExists(id);
    return this.prisma.venue.update({
      where: { id },
      data: {
        isSiteVisited: true,
        siteVisitDate: new Date(),
        siteVisitNote: note || null,
      },
    });
  }

  private async ensureExists(id: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundException('场地不存在');
    return venue;
  }

  // ==================== 教室 ====================

  async findClassrooms(venueId: string) {
    await this.ensureExists(venueId);
    return this.prisma.classroom.findMany({
      where: { venueId },
      orderBy: { name: 'asc' },
    });
  }

  async createClassroom(
    venueId: string,
    data: {
      name: string;
      capacity: number;
      resources?: any;
      timeSlots?: any;
    },
  ) {
    await this.ensureExists(venueId);
    return this.prisma.classroom.create({
      data: { venueId, ...data },
    });
  }

  async updateClassroom(
    id: string,
    data: {
      name?: string;
      capacity?: number;
      resources?: any;
      timeSlots?: any;
    },
  ) {
    await this.ensureClassroomExists(id);
    return this.prisma.classroom.update({ where: { id }, data });
  }

  async deleteClassroom(id: string) {
    const classroom = await this.ensureClassroomExists(id);
    // 检查是否有关联排课
    const scheduleCount = await this.prisma.schedule.count({
      where: { classroomId: id },
    });
    if (scheduleCount > 0) {
      throw new BadRequestException(
        `该教室有 ${scheduleCount} 条关联排课，无法删除`,
      );
    }
    return this.prisma.classroom.delete({ where: { id } });
  }

  async updateClassroomStatus(id: string, status: 'active' | 'maintenance') {
    await this.ensureClassroomExists(id);
    return this.prisma.classroom.update({ where: { id }, data: { status } });
  }

  private async ensureClassroomExists(id: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id },
    });
    if (!classroom) throw new NotFoundException('教室不存在');
    return classroom;
  }
}
