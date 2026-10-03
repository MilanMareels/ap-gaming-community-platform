import { ApiProperty } from '@nestjs/swagger';
import { SpeedrunVariable } from './speedrun_variable.js';
import { SpeedrunRunVariableValue } from './speedrun_run_variable_value.js';

export class SpeedrunVariableValueRelations {

  @ApiProperty({ type: () => SpeedrunVariable })
  variable: SpeedrunVariable;

  @ApiProperty({ isArray: true, type: () => SpeedrunRunVariableValue })
  runValues: SpeedrunRunVariableValue[];
}
