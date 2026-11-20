import { ApiProperty } from '@nestjs/swagger';
import { PlanningTeam } from './planning_team.js';
import { User } from './user.js';
import { PlanningAvailability } from './planning_availability.js';

export class PlanningTeamMemberRelations {

  @ApiProperty({ type: () => PlanningTeam })
  team: PlanningTeam;

  @ApiProperty({ type: () => User })
  user: User;

  @ApiProperty({ isArray: true, type: () => PlanningAvailability })
  availability: PlanningAvailability[];
}
