import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpeedrunRun } from './speedrun_run.js';
import { User } from './user.js';

export class SpeedrunRunPlayerRelations {

  @ApiProperty({ type: () => SpeedrunRun })
  run: SpeedrunRun;

  @ApiPropertyOptional({ type: () => User })
  user: User | null;
}
