import { ApiProperty } from '@nestjs/swagger';
import { Event } from './event.js';
import { TimeTrialParticipant } from './time_trial_participant.js';

export class TimeTrialRelations {

  @ApiProperty({ type: () => Event })
  event: Event;

  @ApiProperty({ isArray: true, type: () => TimeTrialParticipant })
  participants: TimeTrialParticipant[];
}
