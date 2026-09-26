import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BracketMatch } from './bracket_match.js';
import { BracketParticipant } from './bracket_participant.js';

export class BracketMatchParticipantRelations {

  @ApiProperty({ type: () => BracketMatch })
  match: BracketMatch;

  @ApiPropertyOptional({ type: () => BracketParticipant })
  participant: BracketParticipant | null;
}
