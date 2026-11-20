import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import { EsportsMatchResult } from '../../generated/prisma/enums.js';

export class CreateEsportsMatchDto {
  @ApiProperty({ example: 1, description: 'The team (roster game) that played' })
  @IsInt()
  gameId!: number;

  @ApiProperty({ example: 'KdG Esports' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  opponent!: string;

  @ApiPropertyOptional({ example: 'Belgian University League', nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  competition?: string | null;

  @ApiProperty({ example: '2026-11-20T19:00:00.000Z' })
  @IsDateString()
  playedAt!: string;

  @ApiProperty({ enum: EsportsMatchResult, enumName: 'EsportsMatchResult', example: EsportsMatchResult.WIN })
  @IsEnum(EsportsMatchResult)
  result!: EsportsMatchResult;

  @ApiPropertyOptional({ example: 2, nullable: true })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  ourScore?: number | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  opponentScore?: number | null;

  @ApiPropertyOptional({ example: 'https://www.twitch.tv/videos/123', nullable: true })
  @IsUrl({ require_protocol: true })
  @IsOptional()
  vodUrl?: string | null;

  @ApiPropertyOptional({ example: 'Close game on Ascent', nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string | null;
}

export class UpdateEsportsMatchDto extends PartialType(CreateEsportsMatchDto) {}

export class EsportsMatchQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Only matches of this team' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  gameId?: number;
}
