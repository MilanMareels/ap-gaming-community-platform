import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRosterGameDto {
  @ApiProperty({ example: 'League of Legends' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateRosterEntryDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 's123456' })
  @IsString()
  @IsNotEmpty()
  sNumber!: string;

  @ApiProperty({ example: 'xXProGamerXx' })
  @IsString()
  @IsNotEmpty()
  handle!: string;

  @ApiProperty({ example: 'Diamond' })
  @IsString()
  @IsNotEmpty()
  rank!: string;

  @ApiPropertyOptional({ example: 'Support', nullable: true })
  @IsString()
  @IsOptional()
  role?: string | null;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  gameId!: number;

  @ApiPropertyOptional({ example: 'rosters/roster-abc123.png', description: 'S3 storage key for the uploaded image' })
  @IsString()
  @IsOptional()
  imageKey?: string;
}

export class UpdateRosterEntryDto {
  @ApiPropertyOptional({ example: 'xXProGamerXx' })
  @IsString()
  @IsOptional()
  handle?: string;

  @ApiPropertyOptional({ example: 'Diamond' })
  @IsString()
  @IsOptional()
  rank?: string;

  @ApiPropertyOptional({ example: 'Support', nullable: true })
  @IsString()
  @IsOptional()
  role?: string | null;

  @ApiPropertyOptional({ example: 'rosters/roster-abc123.png', description: 'S3 storage key for the uploaded image' })
  @IsString()
  @IsOptional()
  imageKey?: string;
}

export class ReorderRosterEntryItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id!: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  order!: number;
}

export class ReorderRosterEntriesDto {
  @ApiProperty({ type: [ReorderRosterEntryItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderRosterEntryItemDto)
  items!: ReorderRosterEntryItemDto[];
}
