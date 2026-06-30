import { Module } from '@nestjs/common';
import { ClassGroupController } from './class-group.controller';
import { ClassGroupService } from './class-group.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [ClassGroupController],
  providers: [ClassGroupService],
})
export class ClassGroupModule {}
