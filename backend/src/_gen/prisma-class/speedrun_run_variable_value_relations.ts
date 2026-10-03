import { ApiProperty } from '@nestjs/swagger';
import { SpeedrunRun } from './speedrun_run.js';
import { SpeedrunVariable } from './speedrun_variable.js';
import { SpeedrunVariableValue } from './speedrun_variable_value.js';

export class SpeedrunRunVariableValueRelations {

  @ApiProperty({ type: () => SpeedrunRun })
  run: SpeedrunRun;

  @ApiProperty({ type: () => SpeedrunVariable })
  variable: SpeedrunVariable;

  @ApiProperty({ type: () => SpeedrunVariableValue })
  value: SpeedrunVariableValue;
}
