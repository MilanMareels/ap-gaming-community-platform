import { Module } from '@nestjs/common';
import { PointTrialsService } from './point-trials.service.js';
import { PointTrialEntriesService } from './point-trial-entries.service.js';
import { PointTrialsController } from './point-trials.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [PointTrialsController],
  providers: [PointTrialsService, PointTrialEntriesService],
})
export class PointTrialsModule {}
