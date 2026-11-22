import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RbacService } from './rbac.service.js';
import { describeAudit } from '../audit/audit-context.js';

@Injectable()
export class RbacAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
  ) {}

  async listRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getRole(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
        userRoles: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async createRole(name: string, description: string | undefined, permissionKeys: string[]) {
    const existing = await this.prisma.role.findUnique({ where: { name } });
    if (existing) throw new ConflictException('A role with this name already exists');

    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    if (permissions.length !== permissionKeys.length) {
      const found = new Set(permissions.map((p) => p.key));
      const missing = permissionKeys.filter((k) => !found.has(k));
      throw new BadRequestException(`Unknown permissions: ${missing.join(', ')}`);
    }

    describeAudit({ role: name, permissions: permissionKeys.slice().sort() });

    return this.prisma.role.create({
      data: {
        name,
        description,
        permissions: {
          create: permissions.map((p) => ({ permissionId: p.id })),
        },
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  async updateRole(id: number, name: string | undefined, description: string | undefined, permissionKeys: string[] | undefined) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    if (role.isSystem && name && name !== role.name) {
      throw new BadRequestException('Cannot rename a system role');
    }

    if (name && name !== role.name) {
      const existing = await this.prisma.role.findUnique({ where: { name } });
      if (existing) throw new ConflictException('A role with this name already exists');
    }

    // Update permissions if provided
    if (permissionKeys !== undefined) {
      const permissions = await this.prisma.permission.findMany({
        where: { key: { in: permissionKeys } },
      });

      if (permissions.length !== permissionKeys.length) {
        const found = new Set(permissions.map((p) => p.key));
        const missing = permissionKeys.filter((k) => !found.has(k));
        throw new BadRequestException(`Unknown permissions: ${missing.join(', ')}`);
      }

      // The replacement below runs as one batch, so the audit log can't see the old set: say what changed
      const current = await this.prisma.rolePermission.findMany({ where: { roleId: id }, include: { permission: { select: { key: true } } } });
      const currentKeys = new Set(current.map((rp) => rp.permission.key));
      const nextKeys = new Set(permissionKeys);
      describeAudit({
        role: role.name,
        permissionsAdded: [...nextKeys].filter((k) => !currentKeys.has(k)).sort(),
        permissionsRemoved: [...currentKeys].filter((k) => !nextKeys.has(k)).sort(),
      });

      // Replace all permissions
      await this.prisma.$transaction([
        this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
        ...permissions.map((p) =>
          this.prisma.rolePermission.create({
            data: { roleId: id, permissionId: p.id },
          }),
        ),
      ]);

      // Invalidate cache for all users with this role
      const userRoles = await this.prisma.userRole.findMany({
        where: { roleId: id },
        select: { userId: true },
      });
      for (const ur of userRoles) {
        this.rbacService.clearCacheForUser(ur.userId);
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  async deleteRole(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('Cannot delete a system role');

    // Invalidate cache for all users with this role
    const userRoles = await this.prisma.userRole.findMany({
      where: { roleId: id },
      select: { userId: true, user: { select: { email: true } } },
    });

    // The database removes the role's permissions and assignments along with it, out of sight of the audit log
    const permissions = await this.prisma.rolePermission.findMany({ where: { roleId: id }, select: { permission: { select: { key: true } } } });
    describeAudit({
      role: role.name,
      permissions: permissions.map((rp) => rp.permission.key).sort(),
      removedFromUsers: userRoles.map((ur) => ur.user.email).sort(),
    });
    for (const ur of userRoles) {
      this.rbacService.clearCacheForUser(ur.userId);
    }

    await this.prisma.role.delete({ where: { id } });
  }

  async listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async assignRoleToUser(userId: number, roleId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const existing = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });
    if (existing) throw new ConflictException('User already has this role');

    describeAudit({ user: user.email, role: role.name });

    await this.prisma.userRole.create({
      data: { userId, roleId },
    });

    this.rbacService.clearCacheForUser(userId);
  }

  async removeRoleFromUser(userId: number, roleId: number) {
    const userRole = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
      include: { role: true, user: { select: { email: true } } },
    });
    if (!userRole) throw new NotFoundException('User does not have this role');

    describeAudit({ user: userRole.user.email, role: userRole.role.name });

    await this.prisma.userRole.delete({
      where: { id: userRole.id },
    });

    this.rbacService.clearCacheForUser(userId);
  }

  async getUserRoles(userId: number) {
    return this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });
  }
}
