import { ApiProperty } from '@nestjs/swagger';

export class RosterGame {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  name: string;
}
