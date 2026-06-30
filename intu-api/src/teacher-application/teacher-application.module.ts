import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TeacherModule } from '../teacher/teacher.module';
import { NotificationModule } from '../notification/notification.module';
import { TeacherApplicationService } from './teacher-application.service';
import { TeacherApplicationController } from './teacher-application.controller';

@Module({
  imports: [PrismaModule, TeacherModule, NotificationModule],
  providers: [TeacherApplicationService],
  controllers: [TeacherApplicationController],
})
export class TeacherApplicationModule {}
