import { ApiProperty } from '@nestjs/swagger';

export class SpeedrunLevel {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  gameId: number;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: Number })
  position: number;
}
