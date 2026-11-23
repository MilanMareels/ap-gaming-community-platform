import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsBooleanString, IsDateString, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { UserNoteType } from '../../generated/prisma/enums.js';

export class UserListQueryDto {
  @ApiProperty({ required: false, description: 'Search by name, email or sNumber' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Only return admin users when "true"' })
  @IsOptional()
  @IsBooleanString()
  adminOnly?: string;

  @ApiProperty({ required: false, description: 'Only return users with active no-shows when "true"' })
  @IsOptional()
  @IsBooleanString()
  noShowsOnly?: string;

  @ApiProperty({ required: false, default: 1, minimum: 1, description: 'Page number, starting at 1' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 25, minimum: 1, maximum: 100, description: 'Number of users per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class UserListItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  sNumber!: string;

  @ApiProperty()
  isAdmin!: boolean;

  @ApiProperty()
  googleLinked!: boolean;

  @ApiProperty()
  microsoftLinked!: boolean;

  @ApiProperty()
  reservationCount!: number;

  @ApiProperty()
  noShowCount!: number;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({ description: 'Whether an active block keeps this user off the site' })
  isBlocked!: boolean;
}

export class UserListResponseDto {
  @ApiProperty({ type: [UserListItemDto] })
  items!: UserListItemDto[];

  @ApiProperty({ description: 'Total number of users matching the filters' })
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  totalPages!: number;
}

export class UserSsoLinkDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  ssoId!: string;
}

export class UserRecentReservationDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  cuid!: string;

  @ApiProperty()
  inventory!: string;

  @ApiProperty()
  startTime!: Date;

  @ApiProperty()
  endTime!: Date;

  @ApiProperty()
  status!: string;
}

export { UserNoteType };

export class UserNoteDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ enum: UserNoteType, enumName: 'UserNoteType' })
  type!: UserNoteType;

  @ApiProperty()
  content!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    format: 'date-time',
    description: 'When the note stops counting; null keeps it active until someone ends it',
  })
  expiresAt!: Date | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'When this warning was e-mailed to the user; null when it was not' })
  emailedAt!: Date | null;

  @ApiProperty()
  authorId!: number;

  @ApiProperty({ nullable: true })
  authorName!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CreateUserNoteDto {
  @ApiProperty({ description: 'Note content' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ enum: UserNoteType, enumName: 'UserNoteType', required: false, description: 'Defaults to NOTE; BLOCK requires users.block' })
  @IsOptional()
  @IsEnum(UserNoteType)
  type?: UserNoteType;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
    format: 'date-time',
    description: 'When the note stops counting; leave out to keep it active',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @ApiProperty({ required: false, description: 'E-mail this warning to the user (warnings only)' })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}

export class UpdateUserNoteDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @ApiProperty({ enum: UserNoteType, enumName: 'UserNoteType', required: false })
  @IsOptional()
  @IsEnum(UserNoteType)
  type?: UserNoteType;

  @ApiProperty({ required: false, nullable: true, type: String, format: 'date-time', description: 'null makes the note open-ended' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @ApiProperty({ required: false, description: 'End the note now; it stays in the history' })
  @IsOptional()
  @IsBoolean()
  end?: boolean;

  @ApiProperty({ required: false, description: 'E-mail this warning to the user now, if it was not e-mailed before (warnings only)' })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}

/** A note that still counts, as shown next to someone's reservations. */
export class ActiveUserNoteDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ enum: UserNoteType, enumName: 'UserNoteType' })
  type!: UserNoteType;

  @ApiProperty()
  content!: string;

  @ApiProperty({ nullable: true })
  authorName!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  expiresAt!: Date | null;
}

export class UserDetailDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  sNumber!: string;

  @ApiProperty()
  isAdmin!: boolean;

  @ApiProperty({ type: [UserSsoLinkDto] })
  googleLinks!: UserSsoLinkDto[];

  @ApiProperty({ type: [UserSsoLinkDto] })
  microsoftLinks!: UserSsoLinkDto[];

  @ApiProperty()
  reservationCount!: number;

  @ApiProperty()
  noShowCount!: number;

  @ApiProperty({ type: [UserRecentReservationDto] })
  recentReservations!: UserRecentReservationDto[];

  @ApiProperty({ type: [UserNoteDto] })
  notes!: UserNoteDto[];

  @ApiProperty({ nullable: true, type: UserNoteDto, description: 'The block that keeps this user off the site right now' })
  activeBlock!: UserNoteDto | null;
}

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class WhitelistEntryDto {
  @ApiProperty()
  email!: string;

  @ApiProperty()
  userId!: number;

  @ApiProperty({ nullable: true })
  userEmail!: string | null;
}

export class CreateWhitelistDto {
  @ApiProperty({ example: 'someone@gmail.com', description: 'External SSO email to pre-authorize' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 1, description: 'Target user id this email should link to once they sign in' })
  userId!: number;
}
