import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpeedrunRunPlayer {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  runId: number;

  @ApiPropertyOptional({ type: Number })
  userId: number | null;

  @ApiPropertyOptional({ type: String })
  guestName: string | null;

  @ApiProperty({ type: Number })
  position: number;
}
