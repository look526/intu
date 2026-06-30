import { Module } from '@nestjs/common';
import { VenueController, ClassroomController } from './venue.controller';
import { VenueService } from './venue.service';

@Module({
  controllers: [VenueController, ClassroomController],
  providers: [VenueService],
})
export class VenueModule {}
