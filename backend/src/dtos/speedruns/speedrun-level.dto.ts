import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ReorderItemDto } from './speedrun-category.dto.js';

export class CreateSpeedrunLevelDto {
  @ApiProperty({ example: 'Bob-omb Battlefield' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateSpeedrunLevelDto {
  @ApiPropertyOptional({ example: 'Bob-omb Battlefield' })
  @IsString()
  @IsOptional()
  name?: string;
}

export class ReorderSpeedrunLevelsDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}
