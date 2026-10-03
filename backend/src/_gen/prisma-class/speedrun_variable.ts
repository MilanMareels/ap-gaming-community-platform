import { SpeedrunVariableScope } from '../../generated/prisma/enums.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpeedrunVariable {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  gameId: number;

  @ApiPropertyOptional({ type: Number })
  categoryId: number | null;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: Boolean })
  isSubcategory: boolean = false;

  @ApiProperty({ type: Boolean })
  isMandatory: boolean = false;

  @ApiProperty({ enum: SpeedrunVariableScope, enumName: 'SpeedrunVariableScope' })
  scope: SpeedrunVariableScope = SpeedrunVariableScope.GLOBAL;

  @ApiProperty({ type: Number })
  position: number;
}
