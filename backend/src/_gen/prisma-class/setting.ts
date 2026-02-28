import { ApiProperty } from '@nestjs/swagger';

export class Setting {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  key: string;

  @ApiProperty({ type: String })
  value: string;
}
