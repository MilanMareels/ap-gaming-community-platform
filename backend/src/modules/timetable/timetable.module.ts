import { Module } from '@nestjs/common';
import { TimetableService } from './timetable.service.js';
import { TimetableController } from './timetable.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [TimetableController],
  providers: [TimetableService],
})
export class TimetableModule {}
