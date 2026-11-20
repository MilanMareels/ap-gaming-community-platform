import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateScheduleBlockDto,
  TeamScheduleWeekDto,
  UpdateAvailabilityDto,
  UpdateScheduleBlockDto,
  UpdateScheduleHoursDto,
} from '../../dtos/team-schedule/team-schedule.dto.js';
import { wallClockNow } from '../../common/wall-clock.js';

export const SCHEDULE_MANAGE_PERMISSION = 'esports.schedule.manage';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A calendar date (stored as midnight UTC in @db.Date columns) from YYYY-MM-DD. */
export function parseDateKey(key: string): Date {
  const date = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== key) {
    throw new BadRequestException(`Invalid date: ${key}`);
  }
  return date;
}

export const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

/** The Monday of the week a date falls in (this week when no date is given). */
export function mondayOf(key?: string): Date {
  const now = wallClockNow();
  const day = key ? parseDateKey(key) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceMonday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - daysSinceMonday * DAY_MS);
}

/** Who is asking: their user id and whether they hold the schedule permission. */
export interface ScheduleViewer {
  userId: number;
  canManage: boolean;
}

@Injectable()
export class TeamScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  /** Teams the viewer plays in, or every team for schedule managers. */
  listTeams(viewer: ScheduleViewer) {
    return this.prisma.rosterGame.findMany({
      where: viewer.canManage ? undefined : { rosterEntries: { some: { userId: viewer.userId } } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async getWeek(gameId: number, viewer: ScheduleViewer, week?: string): Promise<TeamScheduleWeekDto> {
    const game = await this.loadTeam(gameId, viewer);
    const start = mondayOf(week);
    const end = new Date(start.getTime() + 7 * DAY_MS);
    const entryIds = game.rosterEntries.map((entry) => entry.id);

    const [availability, blocks] = await Promise.all([
      this.prisma.playerAvailability.findMany({
        where: { rosterEntryId: { in: entryIds }, date: { gte: start, lt: end } },
        select: { rosterEntryId: true, date: true, hour: true, status: true, note: true },
      }),
      this.prisma.teamScheduleBlock.findMany({
        where: { gameId, date: { gte: start, lt: end } },
        orderBy: [{ date: 'asc' }, { startHour: 'asc' }],
      }),
    ]);

    return {
      game: { id: game.id, name: game.name, scheduleStartHour: game.scheduleStartHour, scheduleEndHour: game.scheduleEndHour },
      weekStart: toDateKey(start),
      canManage: viewer.canManage,
      players: game.rosterEntries.map((entry) => ({
        rosterEntryId: entry.id,
        handle: entry.handle,
        name: entry.user.name,
        isMe: entry.userId === viewer.userId,
      })),
      availability: availability.map((cell) => ({ ...cell, date: toDateKey(cell.date) })),
      blocks: blocks.map((block) => ({
        id: block.id,
        type: block.type,
        title: block.title,
        date: toDateKey(block.date),
        startHour: block.startHour,
        endHour: block.endHour,
        notes: block.notes,
      })),
    };
  }

  /** Saves changed cells for one player: their own, or anyone's for schedule managers. */
  async updateAvailability(gameId: number, viewer: ScheduleViewer, dto: UpdateAvailabilityDto) {
    const game = await this.loadTeam(gameId, viewer);
    const own = game.rosterEntries.find((entry) => entry.userId === viewer.userId);
    const entryId = dto.rosterEntryId ?? own?.id;

    if (entryId === undefined) throw new BadRequestException('You are not a player on this team');
    if (!game.rosterEntries.some((entry) => entry.id === entryId)) throw new NotFoundException('Player not found on this team');
    if (entryId !== own?.id && !viewer.canManage) throw new ForbiddenException('You can only fill in your own availability');

    for (const cell of dto.cells) {
      if (cell.hour < game.scheduleStartHour || cell.hour >= game.scheduleEndHour) {
        throw new BadRequestException(`Hour ${cell.hour} is outside this team's schedule`);
      }
    }

    await this.prisma.$transaction(
      dto.cells.map((cell) => {
        const where = { rosterEntryId_date_hour: { rosterEntryId: entryId, date: parseDateKey(cell.date), hour: cell.hour } };
        if (cell.status === null) {
          return this.prisma.playerAvailability.deleteMany({ where: where.rosterEntryId_date_hour });
        }
        const note = cell.note?.trim() || null;
        return this.prisma.playerAvailability.upsert({
          where,
          create: { ...where.rosterEntryId_date_hour, status: cell.status, note },
          update: { status: cell.status, ...(cell.note !== undefined ? { note } : {}) },
        });
      }),
    );
  }

  async createBlock(gameId: number, dto: CreateScheduleBlockDto) {
    const game = await this.prisma.rosterGame.findUnique({ where: { id: gameId }, select: { id: true } });
    if (!game) throw new NotFoundException('Team not found');
    this.assertHours(dto.startHour, dto.endHour);

    return this.prisma.teamScheduleBlock.create({
      data: {
        gameId,
        type: dto.type,
        title: dto.title?.trim() || null,
        date: parseDateKey(dto.date),
        startHour: dto.startHour,
        endHour: dto.endHour,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async updateBlock(id: number, dto: UpdateScheduleBlockDto) {
    const block = await this.prisma.teamScheduleBlock.findUnique({ where: { id } });
    if (!block) throw new NotFoundException('Block not found');
    this.assertHours(dto.startHour ?? block.startHour, dto.endHour ?? block.endHour);

    return this.prisma.teamScheduleBlock.update({
      where: { id },
      data: {
        type: dto.type,
        title: dto.title === undefined ? undefined : dto.title?.trim() || null,
        date: dto.date === undefined ? undefined : parseDateKey(dto.date),
        startHour: dto.startHour,
        endHour: dto.endHour,
        notes: dto.notes === undefined ? undefined : dto.notes?.trim() || null,
      },
    });
  }

  async removeBlock(id: number) {
    const block = await this.prisma.teamScheduleBlock.findUnique({ where: { id }, select: { id: true } });
    if (!block) throw new NotFoundException('Block not found');
    await this.prisma.teamScheduleBlock.delete({ where: { id } });
  }

  async updateHours(gameId: number, dto: UpdateScheduleHoursDto) {
    this.assertHours(dto.scheduleStartHour, dto.scheduleEndHour);
    const game = await this.prisma.rosterGame.findUnique({ where: { id: gameId }, select: { id: true } });
    if (!game) throw new NotFoundException('Team not found');
    return this.prisma.rosterGame.update({
      where: { id: gameId },
      data: { scheduleStartHour: dto.scheduleStartHour, scheduleEndHour: dto.scheduleEndHour },
      select: { id: true, name: true, scheduleStartHour: true, scheduleEndHour: true },
    });
  }

  /** The team with its players; only its players and schedule managers may see it. */
  private async loadTeam(gameId: number, viewer: ScheduleViewer) {
    const game = await this.prisma.rosterGame.findUnique({
      where: { id: gameId },
      include: {
        rosterEntries: {
          select: { id: true, userId: true, handle: true, user: { select: { name: true } } },
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!game) throw new NotFoundException('Team not found');
    if (!viewer.canManage && !game.rosterEntries.some((entry) => entry.userId === viewer.userId)) {
      throw new ForbiddenException('Only players of this team can see its schedule');
    }
    return game;
  }

  private assertHours(startHour: number, endHour: number) {
    if (startHour < 0 || endHour > 24 || startHour >= endHour) {
      throw new BadRequestException('The end hour must be after the start hour');
    }
  }
}
