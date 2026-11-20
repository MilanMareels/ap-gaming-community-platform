import { Module } from '@nestjs/common';
import { TeamPlanningService } from './team-planning.service.js';
import { TeamPlanningController } from './team-planning.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { PeopleModule } from '../people/people.module.js';

@Module({
  imports: [AuthModule, RbacModule, PeopleModule],
  controllers: [TeamPlanningController],
  providers: [TeamPlanningService],
})
export class TeamPlanningModule {}
