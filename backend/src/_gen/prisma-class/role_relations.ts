import { ApiProperty } from '@nestjs/swagger';
import { RolePermission } from './role_permission.js';
import { UserRole } from './user_role.js';
import { DynamicFormAccess } from './dynamic_form_access.js';

export class RoleRelations {

  @ApiProperty({ isArray: true, type: () => RolePermission })
  permissions: RolePermission[];

  @ApiProperty({ isArray: true, type: () => UserRole })
  userRoles: UserRole[];

  @ApiProperty({ isArray: true, type: () => DynamicFormAccess })
  formAccess: DynamicFormAccess[];
}
