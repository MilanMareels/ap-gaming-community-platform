import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Bracket } from './bracket.js';
import { BracketMatch } from './bracket_match.js';
import { BracketMatchParticipant } from './bracket_match_participant.js';

export class BracketMatchRelations {

  @ApiProperty({ type: () => Bracket })
  bracket: Bracket;

  @ApiPropertyOptional({ type: () => BracketMatch })
  nextMatch: BracketMatch | null;

  @ApiProperty({ isArray: true, type: () => BracketMatch })
  sourceMatches: BracketMatch[];

  @ApiProperty({ isArray: true, type: () => BracketMatchParticipant })
  participants: BracketMatchParticipant[];
}
