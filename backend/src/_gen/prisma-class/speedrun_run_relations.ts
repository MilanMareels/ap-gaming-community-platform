import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpeedrunGame } from './speedrun_game.js';
import { SpeedrunCategory } from './speedrun_category.js';
import { SpeedrunLevel } from './speedrun_level.js';
import { User } from './user.js';
import { SpeedrunRunPlayer } from './speedrun_run_player.js';
import { SpeedrunRunVariableValue } from './speedrun_run_variable_value.js';

export class SpeedrunRunRelations {

  @ApiProperty({ type: () => SpeedrunGame })
  game: SpeedrunGame;

  @ApiProperty({ type: () => SpeedrunCategory })
  category: SpeedrunCategory;

  @ApiPropertyOptional({ type: () => SpeedrunLevel })
  level: SpeedrunLevel | null;

  @ApiProperty({ type: () => User })
  submitter: User;

  @ApiPropertyOptional({ type: () => User })
  verifier: User | null;

  @ApiProperty({ isArray: true, type: () => SpeedrunRunPlayer })
  players: SpeedrunRunPlayer[];

  @ApiProperty({ isArray: true, type: () => SpeedrunRunVariableValue })
  variableValues: SpeedrunRunVariableValue[];
}
