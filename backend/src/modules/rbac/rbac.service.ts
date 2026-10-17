import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

interface CacheEntry {
  permissions: Set<string>;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 60 seconds

@Injectable()
export class RbacService {
  private cache = new Map<number, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Whether an optionally authenticated caller holds any of the given permissions. Used by public
   * endpoints that only include personal data (emails, student numbers) for staff.
   * Respects role impersonation the same way PermissionGuard does.
   */
  async hasAnyPermission(user: JwtPayload | undefined, permissions: string[]): Promise<boolean> {
    if (!user) return false;
    const granted = user.impersonatingRoleId ? new Set(user.permissions ?? []) : await this.getPermissionsForUser(user.sub);
    return permissions.some((permission) => granted.has(permission));
  }

  async getPermissionsForUser(userId: number): Promise<Set<string>> {
    const cached = this.cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    const userRoles = await this.prisma.userRole.findMany({
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

    const permissions = new Set(userRoles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key)));

    this.cache.set(userId, {
      permissions,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return permissions;
  }

  async getRolesForUser(userId: number): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    return userRoles.map((ur) => ur.role.name);
  }

  clearCacheForUser(userId: number): void {
    this.cache.delete(userId);
  }
}
