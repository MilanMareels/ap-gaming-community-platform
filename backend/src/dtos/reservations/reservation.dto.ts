import { ApiProperty } from '@nestjs/swagger';
import { ActiveUserNoteDto } from '../users/user.dto.js';
import { IsDateString, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export class ReservationRulesDto {
  @ApiProperty({ example: 1, description: 'Active reservations a member may have on one day (0 = no limit)' })
  maxPerDay!: number;

  @ApiProperty({ example: 90, description: "Minutes required between a member's reservations (0 = none)" })
  minGapMinutes!: number;
}

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
  @ApiProperty({ example: 12, required: false, description: 'An existing user, picked from the person search. Takes precedence over email.' })
  @IsInt()
  @IsOptional()
  userId?: number;

  @ApiProperty({ example: 'student@student.ap.be', required: false, description: 'Required when no userId is given' })
  @ValidateIf((dto: AdminCreateReservationDto) => dto.userId === undefined)
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Robin Claes', required: false, description: 'Name for a new person, or for a known person without one' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 's123456', required: false })
  @IsString()
  @IsOptional()
  sNumber?: string;

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
  @ApiProperty({ example: 12, required: false, description: 'Move the reservation to this existing user' })
  @IsInt()
  @IsOptional()
  userId?: number;

  @ApiProperty({ example: 'Robin Claes', required: false })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

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

export class ReservationVerificationDto {
  @ApiProperty({ example: 'cm9x8k2df0000a1b2c3d4e5f6' })
  cuid!: string;

  @ApiProperty()
  userId!: number;

  @ApiProperty({ type: [ActiveUserNoteDto], description: 'Notes about this person that still count, most serious first' })
  activeNotes!: ActiveUserNoteDto[];

  @ApiProperty({ example: 'student@student.ap.be' })
  email!: string;

  @ApiProperty({ example: 's123456' })
  sNumber!: string;

  @ApiProperty({ example: 'pc', enum: ['pc', 'ps5', 'switch'] })
  inventory!: string;

  @ApiProperty({ example: 2 })
  controllers!: number;

  @ApiProperty({ example: '2026-02-28T10:00:00.000Z' })
  startTime!: Date;

  @ApiProperty({ example: '2026-02-28T12:00:00.000Z' })
  endTime!: Date;

  @ApiProperty({ enum: ReservationStatus })
  status!: ReservationStatus;
}

export class MyReservationDto {
  @ApiProperty({ example: 'cm9x8k2df0000a1b2c3d4e5f6' })
  cuid!: string;

  @ApiProperty({ example: 'pc', enum: ['pc', 'ps5', 'switch'] })
  inventory!: string;

  @ApiProperty({ example: 2 })
  controllers!: number;

  @ApiProperty({ example: '2026-02-28T10:00:00.000Z' })
  startTime!: Date;

  @ApiProperty({ example: '2026-02-28T12:00:00.000Z' })
  endTime!: Date;

  @ApiProperty({ enum: ReservationStatus, enumName: 'ReservationStatus' })
  status!: ReservationStatus;
}

export class MyReservationsResponseDto {
  @ApiProperty({ type: [MyReservationDto], description: 'All reservations of the authenticated user, newest first' })
  reservations!: MyReservationDto[];

  @ApiProperty({ example: 1, description: 'Number of no-shows currently counting towards a block' })
  noShowCount!: number;

  @ApiProperty({ example: 3, description: 'Number of no-shows after which the user can no longer make reservations' })
  noShowLimit!: number;

  @ApiProperty({ description: 'Whether the user is blocked from making new reservations' })
  isBlocked!: boolean;
}
