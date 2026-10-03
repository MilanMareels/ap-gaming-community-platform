import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpeedrunGame {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String })
  slug: string;

  @ApiPropertyOptional({ type: String })
  description: string | null;

  @ApiPropertyOptional({ type: String })
  coverImageUrl: string | null;

  @ApiProperty({ type: Boolean })
  hasInGameTimer: boolean = false;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
