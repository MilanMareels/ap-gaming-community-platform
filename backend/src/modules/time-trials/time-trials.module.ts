import { Module } from '@nestjs/common';
import { TimeTrialsService } from './time-trials.service.js';
import { TimeTrialEntriesService } from './time-trial-entries.service.js';
import { TimeTrialsController } from './time-trials.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [TimeTrialsController],
  providers: [TimeTrialsService, TimeTrialEntriesService],
})
export class TimeTrialsModule {}
