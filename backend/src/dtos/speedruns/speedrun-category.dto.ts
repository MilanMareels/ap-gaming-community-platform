import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum SpeedrunCategoryType {
  FULL_GAME = 'FULL_GAME',
  PER_LEVEL = 'PER_LEVEL',
}

export class CreateSpeedrunCategoryDto {
  @ApiProperty({ example: 'Any%' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Complete the game as fast as possible' })
  @IsString()
  @IsOptional()
  rules?: string;

  @ApiProperty({ enum: SpeedrunCategoryType, example: SpeedrunCategoryType.FULL_GAME })
  @IsEnum(SpeedrunCategoryType)
  @IsNotEmpty()
  type!: SpeedrunCategoryType;

  @ApiPropertyOptional({ example: 'exactly', description: '"exactly" or "up_to"' })
  @IsString()
  @IsOptional()
  playerType?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  playerCount?: number;
}

export class UpdateSpeedrunCategoryDto {
  @ApiPropertyOptional({ example: 'Any%' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Complete the game as fast as possible' })
  @IsString()
  @IsOptional()
  rules?: string;

  @ApiPropertyOptional({ enum: SpeedrunCategoryType })
  @IsEnum(SpeedrunCategoryType)
  @IsOptional()
  type?: SpeedrunCategoryType;

  @ApiPropertyOptional({ example: 'exactly' })
  @IsString()
  @IsOptional()
  playerType?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  playerCount?: number;
}

export class ReorderItemDto {
  @ApiProperty()
  @IsInt()
  id!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  position!: number;
}

export class ReorderSpeedrunCategoriesDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}
