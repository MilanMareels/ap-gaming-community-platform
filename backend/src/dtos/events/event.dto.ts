import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ example: 'League of Legends Tournament' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: '2026-03-15T18:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({ example: '2026-03-15T22:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  endTime!: string;

  @ApiProperty({ example: 'Tournament' })
  @IsString()
  @IsNotEmpty()
  type!: string;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'Updated Tournament' })
  @IsString()
  @IsOptional()
  title?: string;

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
}
