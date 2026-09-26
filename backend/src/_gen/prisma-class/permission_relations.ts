import { ApiProperty } from '@nestjs/swagger';
import { RolePermission } from './role_permission.js';

export class PermissionRelations {

  @ApiProperty({ isArray: true, type: () => RolePermission })
  rolePermissions: RolePermission[];
}
