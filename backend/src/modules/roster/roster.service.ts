import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRosterEntryDto, ReorderRosterEntriesDto, UpdateRosterEntryDto } from '../../dtos/roster/roster.dto.js';

/** Public roster responses only show a player's name; email and student number are for roster managers. */
const rosterUser = (includePlayerDetails: boolean) => (includePlayerDetails ? true : { select: { id: true, name: true } });

@Injectable()
export class RosterService {
  constructor(private readonly prisma: PrismaService) {}

  // Roster Games
  async findAllGames(includePlayerDetails = false) {
    return this.prisma.rosterGame.findMany({
      include: {
        rosterEntries: {
          include: {
            user: rosterUser(includePlayerDetails),
          },
          orderBy: { order: 'asc' },
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

  async findAllEntries(includePlayerDetails = false) {
    return this.prisma.rosterEntry.findMany({
      include: {
        user: rosterUser(includePlayerDetails),
        game: true,
      },
      orderBy: { order: 'asc' },
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

    const maxOrder = await this.prisma.rosterEntry.aggregate({
      where: { gameId: Number(dto.gameId) },
      _max: { order: true },
    });

    return this.prisma.rosterEntry.create({
      data: {
        userId: user.id,
        gameId: Number(dto.gameId),
        handle: dto.handle,
        rank: dto.rank,
        role: dto.role,
        imageUrl: imagePath,
        order: (maxOrder._max.order ?? -1) + 1,
      },
      include: {
        user: true,
        game: true,
      },
    });
  }

  async updateEntry(id: number, dto: UpdateRosterEntryDto, imagePath: string | null | undefined) {
    const data: Record<string, unknown> = {};
    if (dto.handle !== undefined) data.handle = dto.handle;
    if (dto.rank !== undefined) data.rank = dto.rank;
    if (dto.role !== undefined) data.role = dto.role;
    if (imagePath !== undefined) data.imageUrl = imagePath;

    return this.prisma.rosterEntry.update({
      where: { id },
      data,
      include: {
        user: true,
        game: true,
      },
    });
  }

  async reorderEntries(dto: ReorderRosterEntriesDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.rosterEntry.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );
  }

  async deleteEntry(id: number) {
    await this.prisma.rosterEntry.delete({ where: { id } });
  }
}
