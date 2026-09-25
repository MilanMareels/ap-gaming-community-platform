import { ApiProperty } from '@nestjs/swagger';
import { PointTrialParticipant } from './point_trial_participant.js';

export class PointTrialEntryRelations {

  @ApiProperty({ type: () => PointTrialParticipant })
  participant: PointTrialParticipant;
}
