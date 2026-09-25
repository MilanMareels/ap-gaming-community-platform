import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PointTrialParticipant {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  pointTrialId: number;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String })
  email: string | null;

  @ApiPropertyOptional({ type: Number })
  userId: number | null;

  @ApiPropertyOptional({ type: Number })
  bestPoints: number | null;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
