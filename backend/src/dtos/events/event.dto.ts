import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum EventCategory {
  SINGLE_DAY = 'SINGLE_DAY',
  MULTI_DAY = 'MULTI_DAY',
  TOURNAMENT_BRACKET = 'TOURNAMENT_BRACKET',
  TOURNAMENT_TIMED = 'TOURNAMENT_TIMED',
  TOURNAMENT_POINTS = 'TOURNAMENT_POINTS',
}

export class CreateEventDto {
  @ApiProperty({ example: 'League of Legends Tournament' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'A fun tournament for all skill levels.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: EventCategory, example: EventCategory.SINGLE_DAY })
  @IsEnum(EventCategory)
  @IsNotEmpty()
  category!: EventCategory;

  @ApiProperty({ example: '2026-03-15T18:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({ example: '2026-03-15T22:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  endTime!: string;

  @ApiPropertyOptional({ example: 'Tournament' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  registrationEnabled?: boolean;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'Updated Tournament' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: EventCategory, example: EventCategory.MULTI_DAY })
  @IsEnum(EventCategory)
  @IsOptional()
  category?: EventCategory;

  @ApiPropertyOptional({ example: '2026-03-16T18:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-03-16T22:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ example: 'Casual' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  registrationEnabled?: boolean;
}
