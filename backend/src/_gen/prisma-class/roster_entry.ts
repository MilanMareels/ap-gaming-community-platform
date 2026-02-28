import { ApiProperty } from '@nestjs/swagger';

export class RosterEntry {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  userId: number;

  @ApiProperty({ type: Number })
  gameId: number;

  @ApiProperty({ type: String })
  handle: string;

  @ApiProperty({ type: String })
  rank: string;

  @ApiProperty({ type: String })
  role: string;
}
