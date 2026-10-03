import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum SpeedrunVariableScope {
  GLOBAL = 'GLOBAL',
  FULL_GAME = 'FULL_GAME',
  PER_LEVEL = 'PER_LEVEL',
}

export class VariableValueDto {
  @ApiProperty({ example: 'N64' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class CreateSpeedrunVariableDto {
  @ApiProperty({ example: 'Platform' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Category ID if variable is category-specific, null for game-wide' })
  @IsInt()
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isSubcategory?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @ApiPropertyOptional({ enum: SpeedrunVariableScope, example: SpeedrunVariableScope.GLOBAL })
  @IsEnum(SpeedrunVariableScope)
  @IsOptional()
  scope?: SpeedrunVariableScope;

  @ApiProperty({ type: [VariableValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariableValueDto)
  values!: VariableValueDto[];
}

export class UpdateSpeedrunVariableDto {
  @ApiPropertyOptional({ example: 'Platform' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  categoryId?: number | null;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isSubcategory?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @ApiPropertyOptional({ enum: SpeedrunVariableScope })
  @IsEnum(SpeedrunVariableScope)
  @IsOptional()
  scope?: SpeedrunVariableScope;

  @ApiPropertyOptional({ type: [VariableValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariableValueDto)
  @IsOptional()
  values?: VariableValueDto[];
}
