import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Permission {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  key: string;

  @ApiPropertyOptional({ type: String })
  description: string | null;
}
