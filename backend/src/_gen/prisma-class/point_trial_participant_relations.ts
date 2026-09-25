import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PointTrial } from './point_trial.js';
import { User } from './user.js';
import { PointTrialEntry } from './point_trial_entry.js';

export class PointTrialParticipantRelations {

  @ApiProperty({ type: () => PointTrial })
  pointTrial: PointTrial;

  @ApiPropertyOptional({ type: () => User })
  user: User | null;

  @ApiProperty({ isArray: true, type: () => PointTrialEntry })
  entries: PointTrialEntry[];
}
