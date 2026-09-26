import { MatchStatus } from '../../generated/prisma/enums.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BracketMatch {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  bracketId: number;

  @ApiProperty({ type: Number })
  round: number;

  @ApiProperty({ type: Number })
  position: number;

  @ApiProperty({ enum: MatchStatus, enumName: 'MatchStatus' })
  status: MatchStatus = MatchStatus.PENDING;

  @ApiPropertyOptional({ type: Number })
  nextMatchId: number | null;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
