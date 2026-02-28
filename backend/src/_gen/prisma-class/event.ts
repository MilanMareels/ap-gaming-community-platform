import { ApiProperty } from '@nestjs/swagger';

export class Event {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: Date })
  startTime: Date;

  @ApiProperty({ type: Date })
  endTime: Date;

  @ApiProperty({ type: String })
  type: string;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
