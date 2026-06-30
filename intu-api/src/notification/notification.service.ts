import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WechatMessageService } from './wechat-message.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly wechatMessage: WechatMessageService,
  ) {}

  /**
   * 发送单条通知（写入 DB + 尝试微信推送）
   */
  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    content: string,
    extra?: { targetUrl?: string; [key: string]: any },
  ) {
    try {
      // 1. 写入站内通知
      await this.prisma.notification.create({
        data: { userId, type, title, content, extra: extra || {} },
      });

      // 2. 尝试发送微信订阅消息（不阻塞业务）
      this.sendWechatNotification(userId, type, title, content, extra?.targetUrl).catch(
        (err) => this.logger.error('微信消息发送异常', err),
      );
    } catch (err) {
      this.logger.error(`通知写入失败: userId=${userId}, type=${type}`, err);
    }
  }

  /**
   * 批量发送通知
   */
  async notifyBatch(
    userIds: string[],
    type: NotificationType,
    title: string,
    content: string,
    extra?: { targetUrl?: string; [key: string]: any },
  ) {
    if (userIds.length === 0) return;

    try {
      // 批量写入站内通知
      await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type,
          title,
          content,
          extra: extra || {},
        })),
      });

      // 异步批量发送微信订阅消息
      for (const userId of userIds) {
        this.sendWechatNotification(userId, type, title, content, extra?.targetUrl).catch(
          (err) => this.logger.error('微信消息发送异常', err),
        );
      }
    } catch (err) {
      this.logger.error(`批量通知写入失败: type=${type}`, err);
    }
  }

  /**
   * 查询用户通知列表
   */
  async findByUser(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const where = { userId };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * 标记单条已读
   */
  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  /**
   * 全部标记已读
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * 未读数量
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  // ==================== 内部方法 ====================

  /**
   * 根据通知类型获取对应的模板 ID
   */
  private getTemplateId(type: NotificationType): string {
    const map: Record<string, string> = {
      order_paid: this.configService.get('WX_TPL_ORDER_PAID') || '',
      teacher_application_result: this.configService.get('WX_TPL_APPLICATION_RESULT') || '',
      venue_application_result: this.configService.get('WX_TPL_APPLICATION_RESULT') || '',
      class_assigned: this.configService.get('WX_TPL_CLASS_ASSIGNED') || '',
      class_started: this.configService.get('WX_TPL_CLASS_STARTED') || '',
      checkin_success: this.configService.get('WX_TPL_CHECKIN_SUCCESS') || '',
      class_reminder: this.configService.get('WX_TPL_CLASS_REMINDER') || '',
    };
    return map[type] || '';
  }

  /**
   * 发送微信订阅消息（内部方法）
   */
  private async sendWechatNotification(
    userId: string,
    type: NotificationType,
    title: string,
    content: string,
    page?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { openid: true },
    });
    if (!user?.openid) return;

    const templateId = this.getTemplateId(type);
    if (!templateId) return;

    // 微信订阅消息 data 格式：每个字段 { value: '' }
    // 这里用通用格式，实际字段需要和模板匹配
    const data: Record<string, { value: string }> = {
      thing1: { value: title.slice(0, 20) },
      thing2: { value: content.slice(0, 20) },
    };

    await this.wechatMessage.sendSubscribeMessage(user.openid, templateId, data, page);
  }
}
