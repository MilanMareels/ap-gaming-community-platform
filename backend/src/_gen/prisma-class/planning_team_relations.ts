import { ApiProperty } from '@nestjs/swagger';
import { PlanningTeamMember } from './planning_team_member.js';
import { PlanningDay } from './planning_day.js';

export class PlanningTeamRelations {

  @ApiProperty({ isArray: true, type: () => PlanningTeamMember })
  members: PlanningTeamMember[];

  @ApiProperty({ isArray: true, type: () => PlanningDay })
  days: PlanningDay[];
}
