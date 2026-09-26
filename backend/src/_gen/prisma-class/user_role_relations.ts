import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.js';
import { Role } from './role.js';

export class UserRoleRelations {

  @ApiProperty({ type: () => User })
  user: User;

  @ApiProperty({ type: () => Role })
  role: Role;
}
