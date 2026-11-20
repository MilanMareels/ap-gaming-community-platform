import { ApiProperty } from '@nestjs/swagger';
import { PlanningDay } from './planning_day.js';
import { PlanningTeamMember } from './planning_team_member.js';

export class PlanningAvailabilityRelations {

  @ApiProperty({ type: () => PlanningDay })
  day: PlanningDay;

  @ApiProperty({ type: () => PlanningTeamMember })
  member: PlanningTeamMember;
}
