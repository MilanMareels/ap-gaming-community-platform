import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Bracket } from './bracket.js';
import { User } from './user.js';
import { BracketMatchParticipant } from './bracket_match_participant.js';

export class BracketParticipantRelations {

  @ApiProperty({ type: () => Bracket })
  bracket: Bracket;

  @ApiPropertyOptional({ type: () => User })
  user: User | null;

  @ApiProperty({ isArray: true, type: () => BracketMatchParticipant })
  matchParticipants: BracketMatchParticipant[];
}
