import { ApiProperty } from '@nestjs/swagger';

export class EventRegistration {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  eventId: number;

  @ApiProperty({ type: Number })
  userId: number;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
