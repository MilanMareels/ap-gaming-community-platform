import { ApiProperty } from '@nestjs/swagger';
import { IsBooleanString, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
