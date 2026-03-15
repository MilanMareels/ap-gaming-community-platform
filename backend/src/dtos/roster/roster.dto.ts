import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
