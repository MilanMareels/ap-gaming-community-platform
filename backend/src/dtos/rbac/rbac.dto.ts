import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Event Manager' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Can manage events and registrations' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: ['events.manage', 'events.registrations.view'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Event Manager' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Can manage events and registrations' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: ['events.manage', 'events.registrations.view'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}

export class RoleResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  isSystem!: boolean;

  @ApiProperty({ type: [String] })
  permissions!: string[];

  @ApiProperty()
  userCount!: number;
}

export class PermissionResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  key!: string;

  @ApiPropertyOptional()
  description?: string | null;
}

export class RoleDetailResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  isSystem!: boolean;

  @ApiProperty({ type: [String] })
  permissions!: string[];
}

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}
