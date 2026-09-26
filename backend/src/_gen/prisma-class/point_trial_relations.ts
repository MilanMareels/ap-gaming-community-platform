import { ApiProperty } from '@nestjs/swagger';
import { Event } from './event.js';
import { PointTrialParticipant } from './point_trial_participant.js';

export class PointTrialRelations {

  @ApiProperty({ type: () => Event })
  event: Event;

  @ApiProperty({ isArray: true, type: () => PointTrialParticipant })
  participants: PointTrialParticipant[];
}
