import { ApiProperty } from '@nestjs/swagger';

export class RosterGame {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: Number })
  scheduleStartHour: number = 13;

  @ApiProperty({ type: Number })
  scheduleEndHour: number = 23;
}
