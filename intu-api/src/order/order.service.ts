import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private readonly includeRelations = {
    student: {
      select: {
        id: true,
        user: { select: { id: true, nickname: true, phone: true, avatar: true } },
      },
    },
    course: {
      select: {
        id: true,
        name: true,
        coverImage: true,
        totalHours: true,
        price: true,
        teacher: { select: { id: true, realName: true } },
      },
    },
  };

  /** 学员下单 */
  async create(data: { courseId: string; scheduleIds?: string[] }, userId: string) {
    // 查找学员记录
    const student = await this.prisma.student.findFirst({
      where: { userId },
    });
    if (!student) {
      throw new BadRequestException('学员信息不存在');
    }

    // 查找课程获取价格
    const course = await this.prisma.course.findUnique({
      where: { id: data.courseId },
    });
    if (!course) {
      throw new NotFoundException('课程不存在');
    }
    if (course.status !== 'published') {
      throw new BadRequestException('该课程暂不可报名');
    }

    return this.prisma.order.create({
      data: {
        student: { connect: { id: student.id } },
        course: { connect: { id: data.courseId } },
        scheduleIds: data.scheduleIds || [],
        amount: course.price,
        status: 'pending',
      },
      include: this.includeRelations,
    });
  }

  /** 学员查看自己的订单 */
  async findAllByStudent(
    userId: string,
    query: { page?: number; pageSize?: number; status?: string },
  ) {
    const student = await this.prisma.student.findFirst({
      where: { userId },
    });
    if (!student) {
      return { items: [], total: 0, page: 1, pageSize: 20 };
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: any = { studentId: student.id };
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: this.includeRelations,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 管理后台查看所有订单 */
  async findAll(query: {
    page?: number;
    pageSize?: number;
    status?: string;
    keyword?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: any = {};

    if (query.status) where.status = query.status;
    if (query.keyword) {
      where.OR = [
        { course: { name: { contains: query.keyword } } },
        { student: { user: { phone: { contains: query.keyword } } } },
        { student: { user: { nickname: { contains: query.keyword } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: this.includeRelations,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    // 为已付款订单计算分班状态
    const enriched = await Promise.all(
      items.map(async (order: any) => {
        if (order.status !== 'paid') {
          return { ...order, classGroupStatus: '-' };
        }
        const assigned = await this.prisma.classGroupStudent.findFirst({
          where: {
            studentId: order.studentId,
            classGroup: { courseId: order.courseId },
          },
        });
        return {
          ...order,
          classGroupStatus: assigned ? '已分班' : '未分班',
        };
      }),
    );

    return { items: enriched, total, page, pageSize };
  }

  /** 订单详情 */
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.includeRelations,
    });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  /** 确认收款 */
  async confirmPaid(id: string) {
    const order = await this.ensureExists(id);
    if (order.status !== 'pending') {
      throw new BadRequestException('只能对待付款订单确认收款');
    }
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date() },
      include: this.includeRelations,
    });

    // 发送支付成功通知
    const student = await this.prisma.student.findUnique({
      where: { id: order.studentId },
      select: { userId: true },
    });
    if (student) {
      const course = await this.prisma.course.findUnique({
        where: { id: order.courseId },
        select: { name: true },
      });
      this.notificationService.notify(
        student.userId,
        'order_paid',
        '支付成功',
        `您报名的「${course?.name || '课程'}」已支付成功，请等待分班通知`,
        { targetUrl: `/pages/order/detail/index?id=${id}` },
      );
    }

    return updated;
  }

  /** 取消订单 */
  async cancel(id: string, userId: string) {
    const order = await this.ensureExists(id);
    if (order.status !== 'pending') {
      throw new BadRequestException('只能取消待付款订单');
    }

    // 验证是否是本人的订单
    const student = await this.prisma.student.findFirst({
      where: { userId },
    });
    if (!student || order.studentId !== student.id) {
      throw new ForbiddenException('无权操作此订单');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: 'cancelled' },
      include: this.includeRelations,
    });
  }

  private async ensureExists(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }
}
