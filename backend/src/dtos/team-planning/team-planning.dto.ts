import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AvailabilityStatus, PlanningBlockType } from '../../generated/prisma/enums.js';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_KEY_MESSAGE = 'dates must be formatted as YYYY-MM-DD';

// ── Responses ─────────────────────────────────────────

export class PlanningTeamSummaryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'AP Valorant' })
  name!: string;

  @ApiProperty({ example: 'Valorant', nullable: true, type: String })
  game!: string | null;

  @ApiProperty({ example: 6, description: 'Players on the team' })
  playerCount!: number;

  @ApiProperty({ example: 4, description: 'Planned days from today on' })
  upcomingDays!: number;

  @ApiProperty({ example: 2, description: "Upcoming days the signed-in player hasn't filled in at all (0 for non-players)" })
  daysToFill!: number;
}

export class PlanningPlayerDto {
  @ApiProperty({ example: 4 })
  memberId!: number;

  @ApiProperty({ example: 'Rocky', description: 'Handle, else name, else email' })
  label!: string;

  @ApiProperty({ example: 'Robin Claes', nullable: true, type: String })
  name!: string | null;

  @ApiProperty()
  isMe!: boolean;
}

export class PlanningBlockDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ enum: PlanningBlockType, enumName: 'PlanningBlockType' })
  type!: PlanningBlockType;

  @ApiProperty({ nullable: true, type: String })
  title!: string | null;

  @ApiProperty({ example: 19 })
  startHour!: number;

  @ApiProperty({ example: 21, description: 'Exclusive' })
  endHour!: number;

  @ApiProperty({ nullable: true, type: String })
  notes!: string | null;
}

export class PlanningDayDto {
  @ApiProperty({ example: 7 })
  id!: number;

  @ApiProperty({ example: '2026-11-23' })
  date!: string;

  @ApiProperty({ example: 13 })
  startHour!: number;

  @ApiProperty({ example: 23, description: 'Exclusive' })
  endHour!: number;

  @ApiProperty({ nullable: true, type: String })
  note!: string | null;

  @ApiProperty({ type: [PlanningBlockDto] })
  blocks!: PlanningBlockDto[];
}

export class PlanningCellDto {
  @ApiProperty({ example: 7 })
  dayId!: number;

  @ApiProperty({ example: 4 })
  memberId!: number;

  @ApiProperty({ example: 19 })
  hour!: number;

  @ApiProperty({ enum: AvailabilityStatus, enumName: 'AvailabilityStatus' })
  status!: AvailabilityStatus;

  @ApiProperty({ nullable: true, type: String })
  note!: string | null;
}

export class PlanningTeamViewDto {
  @ApiProperty({ type: PlanningTeamSummaryDto })
  team!: PlanningTeamSummaryDto;

  @ApiProperty({ nullable: true, type: Number, description: "The signed-in user's member id when they play on this team" })
  myMemberId!: number | null;

  @ApiProperty({ description: 'The signed-in user may edit everyone and plan blocks' })
  canManage!: boolean;

  @ApiProperty({ type: [PlanningPlayerDto] })
  players!: PlanningPlayerDto[];

  @ApiProperty({ type: [PlanningDayDto] })
  days!: PlanningDayDto[];

  @ApiProperty({ type: [PlanningCellDto] })
  availability!: PlanningCellDto[];
}

export class PlanningMemberDto {
  @ApiProperty({ example: 4 })
  id!: number;

  @ApiProperty({ example: 12 })
  userId!: number;

  @ApiProperty({ example: 'Robin Claes', nullable: true, type: String })
  name!: string | null;

  @ApiProperty({ example: 's123456@student.ap.be' })
  email!: string;

  @ApiProperty({ example: 's123456' })
  sNumber!: string;

  @ApiProperty({ example: 'Rocky', nullable: true, type: String })
  handle!: string | null;

  @ApiProperty()
  isPlayer!: boolean;

  @ApiProperty()
  isManager!: boolean;

  @ApiProperty({ description: 'Has signed in with Microsoft, so they can fill in their availability' })
  canSignIn!: boolean;
}

export class PlanningAdminDayDto extends PlanningDayDto {
  @ApiProperty({ example: 4, description: 'Players who filled in at least one hour' })
  filledBy!: number;
}

export class PlanningTeamDetailDto {
  @ApiProperty({ type: PlanningTeamSummaryDto })
  team!: PlanningTeamSummaryDto;

  @ApiProperty({ description: 'The signed-in user may create and delete teams and assign managers' })
  isPlanningAdmin!: boolean;

  @ApiProperty({ type: [PlanningMemberDto] })
  members!: PlanningMemberDto[];

  @ApiProperty({ type: [PlanningAdminDayDto], description: 'All planned days, newest last' })
  days!: PlanningAdminDayDto[];
}

export class PlanningAddDaysResultDto {
  @ApiProperty({ example: 3 })
  added!: number;

  @ApiProperty({ example: 1, description: 'Dates that were already planned' })
  skipped!: number;
}

// ── Requests ──────────────────────────────────────────

export class PlanningTeamViewQueryDto {
  @ApiPropertyOptional({ description: 'Show recent past days instead of upcoming ones' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  past?: boolean;
}

export class SaveCellDto {
  @ApiProperty({ example: 7 })
  @IsInt()
  dayId!: number;

  @ApiProperty({ example: 19 })
  @IsInt()
  @Min(0)
  @Max(23)
  hour!: number;

  @ApiProperty({ enum: AvailabilityStatus, enumName: 'AvailabilityStatus', nullable: true, description: 'null clears the cell' })
  @ValidateIf((cell: SaveCellDto) => cell.status !== null)
  @IsEnum(AvailabilityStatus)
  status!: AvailabilityStatus | null;

  @ApiPropertyOptional({ example: 'vanaf 20:30', nullable: true, type: String, description: 'Left out keeps the current note' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  note?: string | null;
}

export class SaveAvailabilityDto {
  @ApiPropertyOptional({ example: 4, description: "Whose availability; defaults to the signed-in player's own" })
  @IsOptional()
  @IsInt()
  memberId?: number;

  @ApiProperty({ type: [SaveCellDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SaveCellDto)
  cells!: SaveCellDto[];
}

export class CreatePlanningTeamDto {
  @ApiProperty({ example: 'AP Valorant' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @ApiPropertyOptional({ example: 'Valorant', nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  game?: string | null;
}

export class UpdatePlanningTeamDto extends PartialType(CreatePlanningTeamDto) {}

export class AddPlanningMemberDto {
  @ApiPropertyOptional({ example: 12, description: 'Someone picked from the person search; takes precedence over email' })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({ example: 's123456@student.ap.be', description: 'Required when no userId is given' })
  @ValidateIf((dto: AddPlanningMemberDto) => dto.userId === undefined)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Robin Claes' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 's123456' })
  @IsOptional()
  @IsString()
  sNumber?: string;

  @ApiPropertyOptional({ example: 'Rocky', nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  handle?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPlayer?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Only planning admins can make someone a manager' })
  @IsOptional()
  @IsBoolean()
  isManager?: boolean;
}

export class UpdatePlanningMemberDto {
  @ApiPropertyOptional({ example: 'Rocky', nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  handle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPlayer?: boolean;

  @ApiPropertyOptional({ description: 'Only planning admins can change this' })
  @IsOptional()
  @IsBoolean()
  isManager?: boolean;
}

export class AddPlanningDaysDto {
  @ApiProperty({ example: ['2026-11-23', '2026-11-24'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(62)
  @Matches(DATE_KEY, { each: true, message: DATE_KEY_MESSAGE })
  dates!: string[];

  @ApiProperty({ example: 13 })
  @IsInt()
  @Min(0)
  @Max(23)
  startHour!: number;

  @ApiProperty({ example: 23, description: 'Exclusive' })
  @IsInt()
  @Min(1)
  @Max(24)
  endHour!: number;

  @ApiPropertyOptional({ example: 'Voorbereiding finale', nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  note?: string | null;
}

export class UpdatePlanningDayDto {
  @ApiPropertyOptional({ example: 13 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  startHour?: number;

  @ApiPropertyOptional({ example: 23 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  endHour?: number;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  note?: string | null;
}

export class CreatePlanningBlockDto {
  @ApiProperty({ enum: PlanningBlockType, enumName: 'PlanningBlockType', example: PlanningBlockType.SCRIM })
  @IsEnum(PlanningBlockType)
  type!: PlanningBlockType;

  @ApiPropertyOptional({ example: 'Scrim vs KdG', nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string | null;

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

export class UpdatePlanningBlockDto extends PartialType(CreatePlanningBlockDto) {}
