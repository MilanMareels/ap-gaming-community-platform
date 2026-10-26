import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service.js';
import { ReservationsModule } from '../reservations/reservations.module.js';

@Module({
  imports: [ScheduleModule.forRoot(), ReservationsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
