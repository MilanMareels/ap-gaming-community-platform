import { ReservationStatus } from '../../generated/prisma/enums.js';
import { ApiProperty } from '@nestjs/swagger';

export class Reservation {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  cuid: string;

  @ApiProperty({ type: Number })
  userId: number;

  @ApiProperty({ type: Number })
  controllers: number;

  @ApiProperty({ type: String })
  email: string;

  @ApiProperty({ type: String })
  inventory: string;

  @ApiProperty({ type: Date })
  startTime: Date;

  @ApiProperty({ type: Date })
  endTime: Date;

  @ApiProperty({ enum: ReservationStatus, enumName: 'ReservationStatus' })
  status: ReservationStatus;
}
