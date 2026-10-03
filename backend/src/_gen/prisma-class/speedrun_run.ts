import { SpeedrunRunStatus } from '../../generated/prisma/enums.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpeedrunRun {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  gameId: number;

  @ApiProperty({ type: Number })
  categoryId: number;

  @ApiPropertyOptional({ type: Number })
  levelId: number | null;

  @ApiProperty({ type: Number })
  submitterId: number;

  @ApiProperty({ type: Number })
  timeMs: number;

  @ApiPropertyOptional({ type: Number })
  inGameTimeMs: number | null;

  @ApiProperty({ enum: SpeedrunRunStatus, enumName: 'SpeedrunRunStatus' })
  status: SpeedrunRunStatus = SpeedrunRunStatus.PENDING;

  @ApiPropertyOptional({ type: Number })
  verifierId: number | null;

  @ApiPropertyOptional({ type: Date })
  verifiedAt: Date | null;

  @ApiPropertyOptional({ type: String })
  rejectionReason: string | null;

  @ApiProperty({ type: String })
  videoUrl: string;

  @ApiPropertyOptional({ type: String })
  description: string | null;

  @ApiProperty({ type: Date })
  runDate: Date;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
