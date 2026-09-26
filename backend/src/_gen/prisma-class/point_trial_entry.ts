import { ApiProperty } from '@nestjs/swagger';

export class PointTrialEntry {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  participantId: number;

  @ApiProperty({ type: Number })
  points: number;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
