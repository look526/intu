import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { VenueApplicationService } from './venue-application.service';
import { VenueApplicationController } from './venue-application.controller';

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [VenueApplicationService],
  controllers: [VenueApplicationController],
})
export class VenueApplicationModule {}
