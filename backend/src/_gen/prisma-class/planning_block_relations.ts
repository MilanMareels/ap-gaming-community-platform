import { ApiProperty } from '@nestjs/swagger';
import { PlanningDay } from './planning_day.js';

export class PlanningBlockRelations {

  @ApiProperty({ type: () => PlanningDay })
  day: PlanningDay;
}
