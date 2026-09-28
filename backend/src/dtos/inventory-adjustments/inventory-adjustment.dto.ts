import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateInventoryAdjustmentDto {
  @ApiProperty({ example: 'switch', enum: ['pc', 'ps5', 'switch'] })
  @IsEnum(['pc', 'ps5', 'switch'])
  @IsNotEmpty()
  inventory!: string;

  @ApiProperty({ example: -1, description: 'Positive = add capacity, negative = remove' })
  @IsInt()
  @IsNotEmpty()
  quantity!: number;

  @ApiProperty({ example: '2026-09-28T14:00:00.000Z' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ example: '2026-09-28T18:00:00.000Z' })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({ example: 'Switch in use for tournament' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateInventoryAdjustmentDto {
  @ApiPropertyOptional({ example: 'switch', enum: ['pc', 'ps5', 'switch'] })
  @IsEnum(['pc', 'ps5', 'switch'])
  @IsOptional()
  inventory?: string;

  @ApiPropertyOptional({ example: -1 })
  @IsInt()
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ example: '2026-09-28T14:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-09-28T18:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ example: 'Switch in use for tournament' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class InventoryAdjustmentQueryDto {
  @ApiPropertyOptional({ description: 'Filter by date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ enum: ['pc', 'ps5', 'switch'] })
  @IsEnum(['pc', 'ps5', 'switch'])
  @IsOptional()
  inventory?: string;
}

export class InventoryAdjustmentSlotDto {
  @ApiProperty({ example: 'switch' })
  inventory!: string;

  @ApiProperty({ example: -1 })
  quantity!: number;

  @ApiProperty({ example: '2026-09-28T14:00:00.000Z' })
  startTime!: Date;

  @ApiProperty({ example: '2026-09-28T18:00:00.000Z' })
  endTime!: Date;
}
