import { TimeTrialStatus } from '../../generated/prisma/enums.js';
import { ApiProperty } from '@nestjs/swagger';

export class TimeTrial {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  eventId: number;

  @ApiProperty({ enum: TimeTrialStatus, enumName: 'TimeTrialStatus' })
  status: TimeTrialStatus = TimeTrialStatus.ACTIVE;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
