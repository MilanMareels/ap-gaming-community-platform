import { TimeTableType } from '../../generated/prisma/enums.js';
import { ApiProperty } from '@nestjs/swagger';

export class TimeTableEntry {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  dayOfWeek: number;

  @ApiProperty({ type: Date })
  startTime: Date;

  @ApiProperty({ type: Date })
  endTime: Date;

  @ApiProperty({ type: String })
  label: string;

  @ApiProperty({ enum: TimeTableType, enumName: 'TimeTableType' })
  type: TimeTableType;
}
