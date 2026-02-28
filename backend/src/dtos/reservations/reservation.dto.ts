import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ReservationSlotDto {
  @ApiProperty({ example: 'pc' })
  inventory!: string;

  @ApiProperty({ example: 2 })
  controllers!: number;

  @ApiProperty({ example: '2026-02-28T10:00:00.000Z' })
  startTime!: Date;

  @ApiProperty({ example: '2026-02-28T12:00:00.000Z' })
  endTime!: Date;
}

export class CreateReservationDto {
  @ApiProperty({ example: 's123456' })
  @IsString()
  @IsNotEmpty()
  sNumber!: string;

  @ApiProperty({ example: 'student@student.ap.be' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'pc', enum: ['pc', 'ps5', 'switch'] })
  @IsEnum(['pc', 'ps5', 'switch'])
  @IsNotEmpty()
  inventory!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  @Max(4)
  controllers!: number;

  @ApiProperty({ example: '2026-02-28T10:00:00.000Z' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ example: '2026-02-28T12:00:00.000Z' })
  @IsDateString()
  endTime!: string;
}

export enum ReservationStatus {
  RESERVED = 'RESERVED',
  CANCELLED = 'CANCELLED',
  PRESENT = 'PRESENT',
  NO_SHOW = 'NO_SHOW',
}

export class UpdateReservationStatusDto {
  @ApiProperty({ enum: ReservationStatus })
  @IsEnum(ReservationStatus)
  status!: ReservationStatus;
}

export class AdminCreateReservationDto {
  @ApiProperty({ example: 's123456', required: false })
  @IsString()
  @IsOptional()
  sNumber?: string;

  @ApiProperty({ example: 'student@student.ap.be' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'pc', enum: ['pc', 'ps5', 'switch'] })
  @IsEnum(['pc', 'ps5', 'switch'])
  @IsNotEmpty()
  inventory!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  @Max(4)
  controllers!: number;

  @ApiProperty({ example: '2026-02-28T10:00:00.000Z' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ example: '2026-02-28T12:00:00.000Z' })
  @IsDateString()
  endTime!: string;
}

export class UpdateReservationDto {
  @ApiProperty({ example: 'student@student.ap.be', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 's123456', required: false })
  @IsString()
  @IsOptional()
  sNumber?: string;

  @ApiProperty({
    example: 'pc',
    enum: ['pc', 'ps5', 'switch'],
    required: false,
  })
  @IsEnum(['pc', 'ps5', 'switch'])
  @IsOptional()
  inventory?: string;

  @ApiProperty({ example: 2, required: false })
  @IsInt()
  @Min(0)
  @Max(4)
  @IsOptional()
  controllers?: number;

  @ApiProperty({ example: '2026-02-28T10:00:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ example: '2026-02-28T12:00:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  endTime?: string;
}

export class ReservationQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;
}
