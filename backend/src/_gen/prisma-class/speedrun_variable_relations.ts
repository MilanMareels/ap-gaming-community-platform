import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpeedrunGame } from './speedrun_game.js';
import { SpeedrunCategory } from './speedrun_category.js';
import { SpeedrunVariableValue } from './speedrun_variable_value.js';
import { SpeedrunRunVariableValue } from './speedrun_run_variable_value.js';

export class SpeedrunVariableRelations {

  @ApiProperty({ type: () => SpeedrunGame })
  game: SpeedrunGame;

  @ApiPropertyOptional({ type: () => SpeedrunCategory })
  category: SpeedrunCategory | null;

  @ApiProperty({ isArray: true, type: () => SpeedrunVariableValue })
  values: SpeedrunVariableValue[];

  @ApiProperty({ isArray: true, type: () => SpeedrunRunVariableValue })
  runValues: SpeedrunRunVariableValue[];
}
