import { ApiProperty } from '@nestjs/swagger';
import { TimeTrialParticipant } from './time_trial_participant.js';

export class TimeTrialRunRelations {

  @ApiProperty({ type: () => TimeTrialParticipant })
  participant: TimeTrialParticipant;
}
