import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

interface CacheEntry {
  permissions: Set<string>;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 60 seconds

@Injectable()
export class RbacService {
  private cache = new Map<number, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

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
