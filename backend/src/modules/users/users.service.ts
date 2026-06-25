import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReservationStatus } from '../../dtos/reservations/reservation.dto.js';
import type { CreateWhitelistDto, UpdateUserDto, UserDetailDto, UserListItemDto } from '../../dtos/users/user.dto.js';

const WHITELIST_PREFIX = 'admin_whitelist.';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(args: { search?: string; adminOnly?: boolean; noShowsOnly?: boolean }): Promise<UserListItemDto[]> {
    const where: Record<string, unknown> = {};

    if (args.search) {
      where.OR = [
        { name: { contains: args.search, mode: 'insensitive' } },
        { email: { contains: args.search, mode: 'insensitive' } },
        { sNumber: { contains: args.search, mode: 'insensitive' } },
      ];
    }

    if (args.adminOnly) {
      where.adminUsers = { some: {} };
    }

    if (args.noShowsOnly) {
      where.reservations = { some: { status: ReservationStatus.NO_SHOW } };
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        adminUsers: { select: { id: true } },
        googleSSOUsers: { select: { id: true } },
        microsoftSSOUsers: { select: { id: true } },
        _count: {
          select: {
            reservations: true,
          },
        },
      },
      orderBy: { id: 'desc' },
      take: 500,
    });

    const noShowCounts = await this.prisma.reservation.groupBy({
      by: ['userId'],
      where: { userId: { in: users.map((u) => u.id) }, status: ReservationStatus.NO_SHOW },
      _count: { _all: true },
    });
    const noShowMap = new Map(noShowCounts.map((entry) => [entry.userId, entry._count._all]));

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      sNumber: user.sNumber,
      isAdmin: user.adminUsers.length > 0,
      googleLinked: user.googleSSOUsers.length > 0,
      microsoftLinked: user.microsoftSSOUsers.length > 0,
      reservationCount: user._count.reservations,
      noShowCount: noShowMap.get(user.id) ?? 0,
    }));
  }

  async getById(id: number): Promise<UserDetailDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        adminUsers: { select: { id: true } },
        googleSSOUsers: { select: { id: true, ssoId: true } },
        microsoftSSOUsers: { select: { id: true, ssoId: true } },
        reservations: {
          orderBy: { startTime: 'desc' },
          take: 10,
          select: {
            id: true,
            cuid: true,
            inventory: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const [reservationCount, noShowCount] = await Promise.all([
      this.prisma.reservation.count({ where: { userId: id } }),
      this.prisma.reservation.count({ where: { userId: id, status: ReservationStatus.NO_SHOW } }),
    ]);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      sNumber: user.sNumber,
      isAdmin: user.adminUsers.length > 0,
      googleLinks: user.googleSSOUsers,
      microsoftLinks: user.microsoftSSOUsers,
      reservationCount,
      noShowCount,
      recentReservations: user.reservations,
    };
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.assertExists(id);

    if (dto.email) {
      const conflict = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
        select: { id: true },
      });
      if (conflict) throw new BadRequestException('Another user already has that email');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        sNumber: dto.sNumber ?? undefined,
        email: dto.email ?? undefined,
      },
    });
  }

  async promoteToAdmin(id: number) {
    await this.assertExists(id);
    const existing = await this.prisma.adminUser.findFirst({ where: { userId: id } });
    if (existing) return existing;
    return this.prisma.adminUser.create({ data: { userId: id } });
  }

  async demoteFromAdmin(id: number, currentUserId: number) {
    if (id === currentUserId) {
      const adminCount = await this.prisma.adminUser.count();
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot demote yourself when you are the only admin');
      }
    }

    const result = await this.prisma.adminUser.deleteMany({ where: { userId: id } });
    if (result.count === 0) throw new NotFoundException('User is not an admin');
    return { success: true };
  }

  async unlinkSso(id: number, provider: 'google' | 'microsoft') {
    await this.assertExists(id);

    if (provider === 'google') {
      await this.prisma.googleSSOUser.deleteMany({ where: { userId: id } });
    } else {
      await this.prisma.microsoftSSOUser.deleteMany({ where: { userId: id } });
    }
    return { success: true };
  }

  async delete(id: number, currentUserId: number) {
    if (id === currentUserId) {
      throw new BadRequestException('Cannot delete your own account');
    }
    await this.assertExists(id);
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  async listWhitelist() {
    const entries = await this.prisma.setting.findMany({
      where: { key: { startsWith: WHITELIST_PREFIX } },
    });

    const userIds = entries.map((e) => Number(e.value)).filter((n) => Number.isFinite(n));
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.email]));

    return entries.map((entry) => ({
      email: entry.key.slice(WHITELIST_PREFIX.length),
      userId: Number(entry.value),
      userEmail: userMap.get(Number(entry.value)) ?? null,
    }));
  }

  async createWhitelist(dto: CreateWhitelistDto) {
    await this.assertExists(dto.userId);
    const key = `${WHITELIST_PREFIX}${dto.email.toLowerCase()}`;
    await this.prisma.setting.upsert({
      where: { key },
      update: { value: String(dto.userId) },
      create: { key, value: String(dto.userId) },
    });
    return { success: true };
  }

  async deleteWhitelist(email: string) {
    const key = `${WHITELIST_PREFIX}${email.toLowerCase()}`;
    await this.prisma.setting.deleteMany({ where: { key } });
    return { success: true };
  }

  private async assertExists(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
  }
}
