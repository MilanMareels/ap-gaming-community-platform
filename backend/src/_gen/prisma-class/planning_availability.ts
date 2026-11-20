import { AvailabilityStatus } from '../../generated/prisma/enums.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanningAvailability {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  dayId: number;

  @ApiProperty({ type: Number })
  memberId: number;

  @ApiProperty({ type: Number })
  hour: number;

  @ApiProperty({ enum: AvailabilityStatus, enumName: 'AvailabilityStatus' })
  status: AvailabilityStatus;

  @ApiPropertyOptional({ type: String })
  note: string | null;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
