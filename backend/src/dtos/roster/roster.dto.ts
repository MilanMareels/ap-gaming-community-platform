import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

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

  @ApiProperty({ example: 'Support' })
  @IsString()
  @IsNotEmpty()
  role!: string;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  gameId!: number;
}

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
