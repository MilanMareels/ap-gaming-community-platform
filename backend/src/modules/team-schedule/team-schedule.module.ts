import { Module } from '@nestjs/common';
import { TeamScheduleService } from './team-schedule.service.js';
import { TeamScheduleController } from './team-schedule.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [TeamScheduleController],
  providers: [TeamScheduleService],
})
export class TeamScheduleModule {}
