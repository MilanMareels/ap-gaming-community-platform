import { TeamScheduleBlockType } from '../../generated/prisma/enums.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeamScheduleBlock {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  gameId: number;

  @ApiProperty({ enum: TeamScheduleBlockType, enumName: 'TeamScheduleBlockType' })
  type: TeamScheduleBlockType;

  @ApiPropertyOptional({ type: String })
  title: string | null;

  @ApiProperty({ type: Date })
  date: Date;

  @ApiProperty({ type: Number })
  startHour: number;

  @ApiProperty({ type: Number })
  endHour: number;

  @ApiPropertyOptional({ type: String })
  notes: string | null;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
