import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WechatMessageService } from './wechat-message.service';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { ClassReminderService } from './class-reminder.service';

@Module({
  imports: [PrismaModule],
  providers: [WechatMessageService, NotificationService, ClassReminderService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
