import { PlanningBlockType } from '../../generated/prisma/enums.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanningBlock {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  dayId: number;

  @ApiProperty({ enum: PlanningBlockType, enumName: 'PlanningBlockType' })
  type: PlanningBlockType;

  @ApiPropertyOptional({ type: String })
  title: string | null;

  @ApiProperty({ type: Number })
  startHour: number;

  @ApiProperty({ type: Number })
  endHour: number;

  @ApiPropertyOptional({ type: String })
  notes: string | null;
}
