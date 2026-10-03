import { ApiProperty } from '@nestjs/swagger';
import { SpeedrunCategory } from './speedrun_category.js';
import { SpeedrunLevel } from './speedrun_level.js';
import { SpeedrunVariable } from './speedrun_variable.js';
import { SpeedrunRun } from './speedrun_run.js';

export class SpeedrunGameRelations {

  @ApiProperty({ isArray: true, type: () => SpeedrunCategory })
  categories: SpeedrunCategory[];

  @ApiProperty({ isArray: true, type: () => SpeedrunLevel })
  levels: SpeedrunLevel[];

  @ApiProperty({ isArray: true, type: () => SpeedrunVariable })
  variables: SpeedrunVariable[];

  @ApiProperty({ isArray: true, type: () => SpeedrunRun })
  runs: SpeedrunRun[];
}
