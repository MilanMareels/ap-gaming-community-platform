import { SpeedrunCategoryType } from '../../generated/prisma/enums.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpeedrunCategory {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  gameId: number;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String })
  rules: string | null;

  @ApiProperty({ enum: SpeedrunCategoryType, enumName: 'SpeedrunCategoryType' })
  type: SpeedrunCategoryType;

  @ApiProperty({ type: String })
  playerType: string = 'exactly';

  @ApiProperty({ type: Number })
  playerCount: number = 1;

  @ApiProperty({ type: Number })
  position: number;
}
