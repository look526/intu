import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { SystemConfigModule } from './system-config/system-config.module';
import { CourseCategoryModule } from './course-category/course-category.module';
import { UploadModule } from './upload/upload.module';
import { CourseModule } from './course/course.module';
import { TeacherModule } from './teacher/teacher.module';
import { VenueModule } from './venue/venue.module';
import { ScheduleModule } from './schedule/schedule.module';
import { OrderModule } from './order/order.module';
import { CheckinModule } from './checkin/checkin.module';
import { ClassGroupModule } from './class-group/class-group.module';
import { NoteModule } from './note/note.module';
import { ReviewModule } from './review/review.module';
import { TeacherApplicationModule } from './teacher-application/teacher-application.module';
import { VenueApplicationModule } from './venue-application/venue-application.module';
import { NotificationModule } from './notification/notification.module';
import { StudentModule } from './student/student.module';
import { TrialBookingModule } from './trial-booking/trial-booking.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FeedbackModule } from './feedback/feedback.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NestScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    SystemConfigModule,
    CourseCategoryModule,
    UploadModule,
    CourseModule,
    TeacherModule,
    VenueModule,
    ScheduleModule,
    OrderModule,
    CheckinModule,
    ClassGroupModule,
    NoteModule,
    ReviewModule,
    TeacherApplicationModule,
    VenueApplicationModule,
    NotificationModule,
    StudentModule,
    TrialBookingModule,
    DashboardModule,
    FeedbackModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
