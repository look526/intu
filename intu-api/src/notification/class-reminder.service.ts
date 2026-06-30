import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

@Injectable()
export class ClassReminderService {
  private readonly logger = new Logger(ClassReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 每 10 分钟扫描一次，查找 50~60 分钟后开始的排课，发送上课提醒
   */
  @Cron('0 */10 * * * *')
  async handleClassReminder() {
    try {
      const now = new Date();
      const from = new Date(now.getTime() + 50 * 60 * 1000);
      const to = new Date(now.getTime() + 60 * 60 * 1000);

      // 查询即将开始的排课
      const schedules = await this.prisma.schedule.findMany({
        where: {
          startTime: { gte: from, lte: to },
          status: 'scheduled',
        },
        include: {
          course: { select: { name: true } },
          classroom: {
            select: {
              name: true,
              venue: { select: { name: true } },
            },
          },
          classGroup: {
            select: {
              id: true,
              name: true,
              students: {
                select: { student: { select: { userId: true } } },
              },
            },
          },
        },
      });

      for (const schedule of schedules) {
        if (!schedule.classGroup) continue;

        const userIds = schedule.classGroup.students.map(
          (s: any) => s.student.userId,
        );
        if (userIds.length === 0) continue;

        // 防重复：检查是否已发送过该排课的提醒
        const existing = await this.prisma.notification.findFirst({
          where: {
            type: 'class_reminder',
            extra: { path: '$.scheduleId', equals: schedule.id },
          },
        });
        if (existing) continue;

        const startTimeStr = schedule.startTime.toLocaleString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const venueName = schedule.classroom.venue?.name || '';
        const roomName = schedule.classroom.name || '';
        const location = venueName ? `${venueName} ${roomName}` : roomName;

        await this.notificationService.notifyBatch(
          userIds,
          'class_reminder',
          '上课提醒',
          `「${schedule.course.name}」将于 ${startTimeStr} 在 ${location} 开课，请准时到达`,
          {
            targetUrl: '/pages/study/index',
            scheduleId: schedule.id,
          },
        );

        this.logger.log(
          `[ClassReminder] 已发送上课提醒: ${schedule.course.name}, ${userIds.length} 人`,
        );
      }
    } catch (err) {
      this.logger.error('上课提醒定时任务异常', err);
    }
  }
}
