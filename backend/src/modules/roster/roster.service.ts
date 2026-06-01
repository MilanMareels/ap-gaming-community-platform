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

  async createEntry(dto: CreateRosterEntryDto, imagePath: string | null) {
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
    } else if (dto.name) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { name: dto.name },
      });
    }

    return this.prisma.rosterEntry.create({
      data: {
        userId: user.id,
        gameId: Number(dto.gameId),
        handle: dto.handle,
        rank: dto.rank,
        role: dto.role,
        imageUrl: imagePath,
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
}
