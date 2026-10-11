import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImpersonationInfoDto {
  @ApiProperty({ description: 'The real admin user ID behind the impersonation' })
  realUserId!: number;

  @ApiPropertyOptional({ description: 'Name of the real admin user' })
  realUserName?: string | null;

  @ApiPropertyOptional({ description: 'User ID being impersonated (user impersonation)' })
  userId?: number;

  @ApiPropertyOptional({ description: 'Name of the user being impersonated' })
  userName?: string | null;

  @ApiPropertyOptional({ description: 'Role ID being impersonated (role impersonation)' })
  roleId?: number;

  @ApiPropertyOptional({ description: 'Name of the role being impersonated' })
  roleName?: string;
}

export class AuthProfileResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  sNumber!: string;

  @ApiProperty({
    description: 'Whether the authenticated user is an admin user',
  })
  isAdmin!: boolean;

  @ApiProperty({ type: [String], description: 'Role names assigned to the user' })
  roles!: string[];

  @ApiProperty({ type: [String], description: 'Permission keys the user has' })
  permissions!: string[];

  @ApiPropertyOptional({ type: ImpersonationInfoDto, description: 'Present when impersonating a user or role' })
  impersonation?: ImpersonationInfoDto;
}
