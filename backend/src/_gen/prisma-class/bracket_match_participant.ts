import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BracketMatchParticipant {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  matchId: number;

  @ApiPropertyOptional({ type: Number })
  participantId: number | null;

  @ApiPropertyOptional({ type: Number })
  score: number | null;

  @ApiProperty({ type: Boolean })
  isWinner: boolean = false;

  @ApiProperty({ type: Boolean })
  isBye: boolean = false;
}
