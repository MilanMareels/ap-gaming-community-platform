import { ApiProperty } from '@nestjs/swagger';
import { Event } from './event.js';
import { BracketParticipant } from './bracket_participant.js';
import { BracketMatch } from './bracket_match.js';

export class BracketRelations {

  @ApiProperty({ type: () => Event })
  event: Event;

  @ApiProperty({ isArray: true, type: () => BracketParticipant })
  participants: BracketParticipant[];

  @ApiProperty({ isArray: true, type: () => BracketMatch })
  matches: BracketMatch[];
}
