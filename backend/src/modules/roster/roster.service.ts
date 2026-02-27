import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRosterEntryDto } from '../../dtos/roster/roster.dto.js';

@Injectable()
export class RosterService {
  constructor(private readonly prisma: PrismaService) {}

  // Roster Games
  async findAllGames() {
    return this.prisma.rosterGame.findMany({
      include: {
        rosterEntries: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async createGame(name: string) {
    return this.prisma.rosterGame.create({
      data: { name },
    });
  }

  async deleteGame(id: number) {
    await this.prisma.rosterGame.delete({ where: { id } });
  }

  // Roster Entries
  async findAllEntries() {
    return this.prisma.rosterEntry.findMany({
      include: {
        user: true,
        game: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async createEntry(dto: CreateRosterEntryDto) {
    // Find or create user
    let user = await this.prisma.user.findFirst({
      where: { sNumber: dto.sNumber },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          sNumber: dto.sNumber,
          email: `${dto.sNumber}@student.ap.be`,
          name: dto.name,
        },
      });
    }

    return this.prisma.rosterEntry.create({
      data: {
        userId: user.id,
        gameId: dto.gameId,
        handle: dto.handle,
        rank: dto.rank,
        role: dto.role,
      },
      include: {
        user: true,
        game: true,
      },
    });
  }

  async deleteEntry(id: number) {
    await this.prisma.rosterEntry.delete({ where: { id } });
  }

  // Events
  async findAllEvents() {
    const now = new Date();
    return this.prisma.reservation.findMany({
      where: {
        startTime: { gte: now },
        status: 'RESERVED',
      },
      orderBy: {
        startTime: 'asc',
      },
      take: 50,
    });
  }
}
