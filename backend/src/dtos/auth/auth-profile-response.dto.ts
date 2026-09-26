import { ApiProperty } from '@nestjs/swagger';

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
}
