import { ApiProperty } from '@nestjs/swagger';
import { SpeedrunGame } from './speedrun_game.js';
import { SpeedrunVariable } from './speedrun_variable.js';
import { SpeedrunRun } from './speedrun_run.js';

export class SpeedrunCategoryRelations {

  @ApiProperty({ type: () => SpeedrunGame })
  game: SpeedrunGame;

  @ApiProperty({ isArray: true, type: () => SpeedrunVariable })
  variables: SpeedrunVariable[];

  @ApiProperty({ isArray: true, type: () => SpeedrunRun })
  runs: SpeedrunRun[];
}
