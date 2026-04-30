import { ApiProperty } from '@nestjs/swagger';

export class Form {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String })
  url: string;
}
