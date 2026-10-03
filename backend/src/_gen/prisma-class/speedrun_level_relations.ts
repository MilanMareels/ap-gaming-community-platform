import { ApiProperty } from '@nestjs/swagger';
import { SpeedrunGame } from './speedrun_game.js';
import { SpeedrunRun } from './speedrun_run.js';

export class SpeedrunLevelRelations {

  @ApiProperty({ type: () => SpeedrunGame })
  game: SpeedrunGame;

  @ApiProperty({ isArray: true, type: () => SpeedrunRun })
  runs: SpeedrunRun[];
}
