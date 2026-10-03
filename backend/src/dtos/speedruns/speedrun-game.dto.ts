import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateSpeedrunGameDto {
  @ApiProperty({ example: 'Super Mario 64' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'super-mario-64' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Classic N64 platformer' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  hasInGameTimer?: boolean;
}

export class UpdateSpeedrunGameDto {
  @ApiPropertyOptional({ example: 'Super Mario 64' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'super-mario-64' })
  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
  slug?: string;

  @ApiPropertyOptional({ example: 'Classic N64 platformer' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  hasInGameTimer?: boolean;
}
