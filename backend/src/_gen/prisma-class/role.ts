import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Role {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String })
  description: string | null;

  @ApiProperty({ type: Boolean })
  isSystem: boolean = false;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
