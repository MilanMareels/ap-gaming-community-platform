import { ApiProperty } from '@nestjs/swagger';

export class UserRole {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  userId: number;

  @ApiProperty({ type: Number })
  roleId: number;
}
