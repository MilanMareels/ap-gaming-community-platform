import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimeTrial } from './time_trial.js';
import { User } from './user.js';
import { TimeTrialRun } from './time_trial_run.js';

export class TimeTrialParticipantRelations {

  @ApiProperty({ type: () => TimeTrial })
  timeTrial: TimeTrial;

  @ApiPropertyOptional({ type: () => User })
  user: User | null;

  @ApiProperty({ isArray: true, type: () => TimeTrialRun })
  runs: TimeTrialRun[];
}
