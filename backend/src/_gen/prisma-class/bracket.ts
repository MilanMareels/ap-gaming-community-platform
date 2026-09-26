import { BracketFormat, BracketStatus } from '../../generated/prisma/enums.js';
import { ApiProperty } from '@nestjs/swagger';

export class Bracket {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  eventId: number;

  @ApiProperty({ enum: BracketFormat, enumName: 'BracketFormat' })
  format: BracketFormat = BracketFormat.SINGLE_ELIMINATION;

  @ApiProperty({ type: Number })
  playersPerMatch: number = 2;

  @ApiProperty({ type: Number })
  advancingPerMatch: number = 1;

  @ApiProperty({ type: Boolean })
  thirdPlaceMatch: boolean = false;

  @ApiProperty({ enum: BracketStatus, enumName: 'BracketStatus' })
  status: BracketStatus = BracketStatus.DRAFT;

  @ApiProperty({ type: Number })
  totalRounds: number = 0;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
