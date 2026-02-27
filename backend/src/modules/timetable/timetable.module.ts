import { Module } from '@nestjs/common';
import { TimetableService } from './timetable.service.js';
import { TimetableController } from './timetable.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [TimetableController],
  providers: [TimetableService],
})
export class TimetableModule {}
