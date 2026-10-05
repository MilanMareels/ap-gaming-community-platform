import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export enum BracketFormat {
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
}

export class CreateBracketDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(2)
  @IsNotEmpty()
  playersPerMatch!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  advancingPerMatch!: number;

  @ApiPropertyOptional({
    enum: BracketFormat,
    example: BracketFormat.SINGLE_ELIMINATION,
  })
  @IsEnum(BracketFormat)
  @IsOptional()
  format?: BracketFormat;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  thirdPlaceMatch?: boolean;
}

export class UpdateBracketDto {
  @ApiPropertyOptional({ example: 2 })
  @IsInt()
  @Min(2)
  @IsOptional()
  playersPerMatch?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  advancingPerMatch?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  thirdPlaceMatch?: boolean;
}
