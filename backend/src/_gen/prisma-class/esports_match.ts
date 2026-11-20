import { EsportsMatchResult } from '../../generated/prisma/enums.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EsportsMatch {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  gameId: number;

  @ApiProperty({ type: String })
  opponent: string;

  @ApiPropertyOptional({ type: String })
  competition: string | null;

  @ApiProperty({ type: Date })
  playedAt: Date;

  @ApiProperty({ enum: EsportsMatchResult, enumName: 'EsportsMatchResult' })
  result: EsportsMatchResult;

  @ApiPropertyOptional({ type: Number })
  ourScore: number | null;

  @ApiPropertyOptional({ type: Number })
  opponentScore: number | null;

  @ApiPropertyOptional({ type: String })
  vodUrl: string | null;

  @ApiPropertyOptional({ type: String })
  notes: string | null;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
