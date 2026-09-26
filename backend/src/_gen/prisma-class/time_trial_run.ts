import { ApiProperty } from '@nestjs/swagger';

export class TimeTrialRun {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  participantId: number;

  @ApiProperty({ type: Number })
  timeMs: number;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
