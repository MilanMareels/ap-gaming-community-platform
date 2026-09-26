import { ApiProperty } from '@nestjs/swagger';
import { Role } from './role.js';
import { Permission } from './permission.js';

export class RolePermissionRelations {

  @ApiProperty({ type: () => Role })
  role: Role;

  @ApiProperty({ type: () => Permission })
  permission: Permission;
}
