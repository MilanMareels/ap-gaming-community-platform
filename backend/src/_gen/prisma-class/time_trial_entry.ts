import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TimeTrialEntry {

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
  timeMs: number | null;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
