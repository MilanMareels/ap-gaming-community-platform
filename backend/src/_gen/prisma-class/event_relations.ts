import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventRegistration } from './event_registration.js';
import { Bracket } from './bracket.js';
import { TimeTrial } from './time_trial.js';
import { PointTrial } from './point_trial.js';

export class EventRelations {

  @ApiProperty({ isArray: true, type: () => EventRegistration })
  registrations: EventRegistration[];

  @ApiPropertyOptional({ type: () => Bracket })
  bracket: Bracket | null;

  @ApiPropertyOptional({ type: () => TimeTrial })
  timeTrial: TimeTrial | null;

  @ApiPropertyOptional({ type: () => PointTrial })
  pointTrial: PointTrial | null;
}
