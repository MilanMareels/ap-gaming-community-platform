import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RunPlayerDto {
  @ApiPropertyOptional({ description: 'User ID for registered players' })
  @IsInt()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({ example: 'GuestRunner', description: 'Name for unregistered players' })
  @IsString()
  @IsOptional()
  guestName?: string;
}

export class RunVariableValueDto {
  @ApiProperty({ description: 'Variable ID' })
  @IsInt()
  variableId!: number;

  @ApiProperty({ description: 'Selected value ID' })
  @IsInt()
  valueId!: number;
}

export class SubmitSpeedrunRunDto {
  @ApiProperty({ description: 'Game ID' })
  @IsInt()
  gameId!: number;

  @ApiProperty({ description: 'Category ID' })
  @IsInt()
  categoryId!: number;

  @ApiPropertyOptional({ description: 'Level ID (for per-level categories)' })
  @IsInt()
  @IsOptional()
  levelId?: number;

  @ApiProperty({ example: 123456, description: 'Speedrun time in milliseconds' })
  @IsInt()
  @Min(1)
  timeMs!: number;

  @ApiPropertyOptional({ example: 120000, description: 'In-game time in milliseconds' })
  @IsInt()
  @Min(1)
  @IsOptional()
  inGameTimeMs?: number;

  @ApiProperty({ example: 'https://youtube.com/watch?v=abc123' })
  @IsString()
  @IsNotEmpty()
  videoUrl!: string;

  @ApiPropertyOptional({ example: '<p>Great run!</p>', description: 'Rich text description (HTML)' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2026-10-03', description: 'Date the run was performed' })
  @IsDateString()
  runDate!: string;

  @ApiProperty({ type: [RunPlayerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RunPlayerDto)
  players!: RunPlayerDto[];

  @ApiPropertyOptional({ type: [RunVariableValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RunVariableValueDto)
  @IsOptional()
  variableValues?: RunVariableValueDto[];
}

export class UpdateSpeedrunRunDto {
  @ApiPropertyOptional({ example: 123456 })
  @IsInt()
  @Min(1)
  @IsOptional()
  timeMs?: number;

  @ApiPropertyOptional({ example: 120000 })
  @IsInt()
  @Min(1)
  @IsOptional()
  inGameTimeMs?: number;

  @ApiPropertyOptional({ example: 'https://youtube.com/watch?v=abc123' })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({ example: '<p>Great run!</p>' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '2026-10-03' })
  @IsDateString()
  @IsOptional()
  runDate?: string;

  @ApiPropertyOptional({ type: [RunPlayerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RunPlayerDto)
  @IsOptional()
  players?: RunPlayerDto[];

  @ApiPropertyOptional({ type: [RunVariableValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RunVariableValueDto)
  @IsOptional()
  variableValues?: RunVariableValueDto[];
}

export class VerifySpeedrunRunDto {
  // No body needed - verified by the current user
}

export class RejectSpeedrunRunDto {
  @ApiProperty({ example: 'Video does not show the full run' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
