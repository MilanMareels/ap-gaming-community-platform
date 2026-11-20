import { ApiProperty } from '@nestjs/swagger';
import { PlanningTeam } from './planning_team.js';
import { PlanningAvailability } from './planning_availability.js';
import { PlanningBlock } from './planning_block.js';

export class PlanningDayRelations {

  @ApiProperty({ type: () => PlanningTeam })
  team: PlanningTeam;

  @ApiProperty({ isArray: true, type: () => PlanningAvailability })
  availability: PlanningAvailability[];

  @ApiProperty({ isArray: true, type: () => PlanningBlock })
  blocks: PlanningBlock[];
}
