import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TimeTrialParticipant {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  timeTrialId: number;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String })
  email: string | null;

  @ApiPropertyOptional({ type: Number })
  userId: number | null;

  @ApiPropertyOptional({ type: Number })
  bestTimeMs: number | null;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
