import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class User {

  @ApiProperty({ type: Number })
  id: number;

  @ApiPropertyOptional({ type: String })
  name: string | null;

  @ApiProperty({ type: String })
  email: string;

  @ApiProperty({ type: String })
  sNumber: string;
}
