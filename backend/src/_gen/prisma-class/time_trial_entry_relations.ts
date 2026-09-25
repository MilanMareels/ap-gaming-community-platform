import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimeTrial } from './time_trial.js';
import { User } from './user.js';

export class TimeTrialEntryRelations {

  @ApiProperty({ type: () => TimeTrial })
  timeTrial: TimeTrial;

  @ApiPropertyOptional({ type: () => User })
  user: User | null;
}
