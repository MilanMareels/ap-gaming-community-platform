import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { RbacAdminService } from './rbac-admin.service.js';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto, RoleDetailResponseDto, PermissionResponseDto, SuccessResponseDto } from '../../dtos/rbac/rbac.dto.js';

@ApiTags('rbac')
@Controller('rbac')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RbacController {
  constructor(private readonly rbacAdminService: RbacAdminService) {}

  @Get('roles')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'List all roles' })
  @ApiOkResponse({ type: [RoleResponseDto] })
  async listRoles() {
    const roles = await this.rbacAdminService.listRoles();
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => rp.permission.key),
      userCount: role._count.userRoles,
    }));
  }

  @Get('roles/:id')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Get role details with assigned users' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  async getRole(@Param('id', ParseIntPipe) id: number) {
    const role = await this.rbacAdminService.getRole(id);
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => rp.permission.key),
      users: role.userRoles.map((ur) => ur.user),
    };
  }

  @Post('roles')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiCreatedResponse({ type: RoleDetailResponseDto })
  async createRole(@Body() dto: CreateRoleDto) {
    const role = await this.rbacAdminService.createRole(dto.name, dto.description, dto.permissions);
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => rp.permission.key),
    };
  }

  @Patch('roles/:id')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Update a role' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  async updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    const role = await this.rbacAdminService.updateRole(id, dto.name, dto.description, dto.permissions);
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => rp.permission.key),
    };
  }

  @Delete('roles/:id')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Delete a role' })
  @ApiOkResponse({ type: SuccessResponseDto })
  async deleteRole(@Param('id', ParseIntPipe) id: number) {
    await this.rbacAdminService.deleteRole(id);
    return { success: true };
  }

  @Get('permissions')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'List all available permissions' })
  @ApiOkResponse({ type: [PermissionResponseDto] })
  async listPermissions() {
    return this.rbacAdminService.listPermissions();
  }

  @Post('users/:userId/roles/:roleId')
  @RequirePermissions('users.roles.manage')
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiCreatedResponse({ type: SuccessResponseDto })
  async assignRole(@Param('userId', ParseIntPipe) userId: number, @Param('roleId', ParseIntPipe) roleId: number) {
    await this.rbacAdminService.assignRoleToUser(userId, roleId);
    return { success: true };
  }

  @Delete('users/:userId/roles/:roleId')
  @RequirePermissions('users.roles.manage')
  @ApiOperation({ summary: 'Remove a role from a user' })
  @ApiOkResponse({ type: SuccessResponseDto })
  async removeRole(@Param('userId', ParseIntPipe) userId: number, @Param('roleId', ParseIntPipe) roleId: number) {
    await this.rbacAdminService.removeRoleFromUser(userId, roleId);
    return { success: true };
  }

  @Get('users/:userId/roles')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Get roles assigned to a user' })
  @ApiOkResponse({ type: [RoleDetailResponseDto] })
  async getUserRoles(@Param('userId', ParseIntPipe) userId: number) {
    const userRoles = await this.rbacAdminService.getUserRoles(userId);
    return userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
      isSystem: ur.role.isSystem,
      permissions: ur.role.permissions.map((rp) => rp.permission.key),
    }));
  }
}
