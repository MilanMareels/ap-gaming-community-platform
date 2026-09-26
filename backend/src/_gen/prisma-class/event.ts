import { EventCategory } from '../../generated/prisma/enums.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Event {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  title: string;

  @ApiPropertyOptional({ type: String })
  description: string | null;

  @ApiProperty({ enum: EventCategory, enumName: 'EventCategory' })
  category: EventCategory = EventCategory.SINGLE_DAY;

  @ApiProperty({ type: Date })
  startTime: Date;

  @ApiProperty({ type: Date })
  endTime: Date;

  @ApiPropertyOptional({ type: String })
  type: string | null;

  @ApiProperty({ type: Boolean })
  registrationEnabled: boolean = false;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
