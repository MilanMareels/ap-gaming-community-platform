import { PointTrialStatus } from '../../generated/prisma/enums.js';
import { ApiProperty } from '@nestjs/swagger';

export class PointTrial {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  eventId: number;

  @ApiProperty({ enum: PointTrialStatus, enumName: 'PointTrialStatus' })
  status: PointTrialStatus = PointTrialStatus.ACTIVE;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
