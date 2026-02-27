import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export enum TimeTableType {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export class CreateTimeTableEntryDto {
  @ApiProperty({ example: 1, description: 'Day of week (1=Monday, 7=Sunday)' })
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime!: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime!: string;

  @ApiProperty({ example: 'Open Access' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ enum: TimeTableType })
  @IsEnum(TimeTableType)
  type!: TimeTableType;
}

export class UpdateTimeTableEntryDto {
  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime!: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime!: string;

  @ApiProperty({ example: 'Open Access' })
  @IsString()
  label!: string;

  @ApiProperty({ enum: TimeTableType })
  @IsEnum(TimeTableType)
  type!: TimeTableType;
}
