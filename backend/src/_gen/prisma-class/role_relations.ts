import { ApiProperty } from '@nestjs/swagger';
import { RolePermission } from './role_permission.js';
import { UserRole } from './user_role.js';

export class RoleRelations {

  @ApiProperty({ isArray: true, type: () => RolePermission })
  permissions: RolePermission[];

  @ApiProperty({ isArray: true, type: () => UserRole })
  userRoles: UserRole[];
}
