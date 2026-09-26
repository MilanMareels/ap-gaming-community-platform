import { ApiProperty } from '@nestjs/swagger';

export class RolePermission {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  roleId: number;

  @ApiProperty({ type: Number })
  permissionId: number;
}
