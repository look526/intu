import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { TrialBookingController } from './trial-booking.controller';
import { TrialBookingService } from './trial-booking.service';
import { getJwtSecret } from '../auth/jwt-secret';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: getJwtSecret(cfg),
      }),
    }),
  ],
  controllers: [TrialBookingController],
  providers: [TrialBookingService],
})
export class TrialBookingModule {}
