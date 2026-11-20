import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanningDay {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  teamId: number;

  @ApiProperty({ type: Date })
  date: Date;

  @ApiProperty({ type: Number })
  startHour: number = 13;

  @ApiProperty({ type: Number })
  endHour: number = 23;

  @ApiPropertyOptional({ type: String })
  note: string | null;
}
