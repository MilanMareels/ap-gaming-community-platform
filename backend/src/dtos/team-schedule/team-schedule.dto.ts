import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AvailabilityStatus, TeamScheduleBlockType } from '../../generated/prisma/enums.js';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_KEY_MESSAGE = 'date must be formatted as YYYY-MM-DD';

export class TeamScheduleWeekQueryDto {
  @ApiPropertyOptional({ example: '2026-11-16', description: 'Any day of the week to show (defaults to this week)' })
  @IsOptional()
  @Matches(DATE_KEY, { message: DATE_KEY_MESSAGE })
  week?: string;
}

export class TeamScheduleGameDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Valorant' })
  name!: string;

  @ApiProperty({ example: 13, description: 'First hour shown in the grid' })
  scheduleStartHour!: number;

  @ApiProperty({ example: 23, description: 'The grid runs until this hour' })
  scheduleEndHour!: number;
}

export class TeamSchedulePlayerDto {
  @ApiProperty({ example: 4 })
  rosterEntryId!: number;

  @ApiProperty({ example: 'Rocky' })
  handle!: string;

  @ApiProperty({ example: 'Robin Claes', nullable: true, type: String })
  name!: string | null;

  @ApiProperty({ description: 'This is the signed-in user' })
  isMe!: boolean;
}

export class AvailabilityCellDto {
  @ApiProperty({ example: '2026-11-16' })
  @Matches(DATE_KEY, { message: DATE_KEY_MESSAGE })
  date!: string;

  @ApiProperty({ example: 19, description: 'The hour starting at hour:00' })
  @IsInt()
  @Min(0)
  @Max(23)
  hour!: number;

  @ApiProperty({ enum: AvailabilityStatus, enumName: 'AvailabilityStatus', nullable: true, description: 'null clears the cell' })
  @ValidateIf((cell: AvailabilityCellDto) => cell.status !== null)
  @IsEnum(AvailabilityStatus)
  status!: AvailabilityStatus | null;

  @ApiPropertyOptional({ example: 'vanaf 20:30', nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  note?: string | null;
}

/** A filled-in cell as stored; empty cells aren't returned. */
export class PlayerAvailabilityDto {
  @ApiProperty({ example: 4 })
  rosterEntryId!: number;

  @ApiProperty({ example: '2026-11-16' })
  date!: string;

  @ApiProperty({ example: 19 })
  hour!: number;

  @ApiProperty({ enum: AvailabilityStatus, enumName: 'AvailabilityStatus' })
  status!: AvailabilityStatus;

  @ApiProperty({ example: 'vanaf 20:30', nullable: true, type: String })
  note!: string | null;
}

export class UpdateAvailabilityDto {
  @ApiPropertyOptional({ example: 4, description: "Whose availability; defaults to the signed-in player's own" })
  @IsOptional()
  @IsInt()
  rosterEntryId?: number;

  @ApiProperty({ type: [AvailabilityCellDto] })
  @IsArray()
  @ArrayMaxSize(7 * 24)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityCellDto)
  cells!: AvailabilityCellDto[];
}

export class CreateScheduleBlockDto {
  @ApiProperty({ enum: TeamScheduleBlockType, enumName: 'TeamScheduleBlockType', example: TeamScheduleBlockType.SCRIM })
  @IsEnum(TeamScheduleBlockType)
  type!: TeamScheduleBlockType;

  @ApiPropertyOptional({ example: 'Scrim vs KdG', nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string | null;

  @ApiProperty({ example: '2026-11-16' })
  @Matches(DATE_KEY, { message: DATE_KEY_MESSAGE })
  date!: string;

  @ApiProperty({ example: 19 })
  @IsInt()
  @Min(0)
  @Max(23)
  startHour!: number;

  @ApiProperty({ example: 21, description: 'Exclusive' })
  @IsInt()
  @Min(1)
  @Max(24)
  endHour!: number;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}

export class UpdateScheduleBlockDto extends PartialType(CreateScheduleBlockDto) {}

export class TeamScheduleBlockDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ enum: TeamScheduleBlockType, enumName: 'TeamScheduleBlockType' })
  type!: TeamScheduleBlockType;

  @ApiProperty({ nullable: true, type: String })
  title!: string | null;

  @ApiProperty({ example: '2026-11-16' })
  date!: string;

  @ApiProperty({ example: 19 })
  startHour!: number;

  @ApiProperty({ example: 21 })
  endHour!: number;

  @ApiProperty({ nullable: true, type: String })
  notes!: string | null;
}

export class UpdateScheduleHoursDto {
  @ApiProperty({ example: 13 })
  @IsInt()
  @Min(0)
  @Max(23)
  scheduleStartHour!: number;

  @ApiProperty({ example: 23 })
  @IsInt()
  @Min(1)
  @Max(24)
  scheduleEndHour!: number;
}

export class TeamScheduleWeekDto {
  @ApiProperty({ type: TeamScheduleGameDto })
  game!: TeamScheduleGameDto;

  @ApiProperty({ example: '2026-11-16', description: 'The Monday the week starts on' })
  weekStart!: string;

  @ApiProperty({ description: 'The signed-in user may plan blocks and edit everyone' })
  canManage!: boolean;

  @ApiProperty({ type: [TeamSchedulePlayerDto] })
  players!: TeamSchedulePlayerDto[];

  @ApiProperty({ type: [PlayerAvailabilityDto] })
  availability!: PlayerAvailabilityDto[];

  @ApiProperty({ type: [TeamScheduleBlockDto] })
  blocks!: TeamScheduleBlockDto[];
}

export class TeamScheduleTeamDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Valorant' })
  name!: string;
}
