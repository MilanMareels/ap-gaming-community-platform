import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeamScheduleService, mondayOf, parseDateKey } from '../../src/modules/team-schedule/team-schedule.service.js';
import { PrismaService } from '../../src/modules/prisma/prisma.service.js';
import { AvailabilityStatus, TeamScheduleBlockType } from '../../src/generated/prisma/enums.js';

const team = {
  id: 1,
  name: 'Valorant',
  scheduleStartHour: 13,
  scheduleEndHour: 23,
  rosterEntries: [
    { id: 10, userId: 100, handle: 'Rocky', user: { name: 'Robin Claes' } },
    { id: 11, userId: 101, handle: 'Jorrit', user: { name: null } },
  ],
};

const player = { userId: 100, canManage: false };
const outsider = { userId: 999, canManage: false };
const manager = { userId: 999, canManage: true };

describe('week helpers', () => {
  it('starts the week on Monday', () => {
    expect(mondayOf('2026-11-20').toISOString()).toBe('2026-11-16T00:00:00.000Z'); // Friday
    expect(mondayOf('2026-11-22').toISOString()).toBe('2026-11-16T00:00:00.000Z'); // Sunday
    expect(mondayOf('2026-11-16').toISOString()).toBe('2026-11-16T00:00:00.000Z'); // Monday
  });

  it('refuses dates that do not exist', () => {
    expect(() => parseDateKey('2026-02-30')).toThrow(BadRequestException);
  });
});

describe('TeamScheduleService', () => {
  let service: TeamScheduleService;
  let prisma: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TeamScheduleService,
        {
          provide: PrismaService,
          useValue: {
            rosterGame: {
              findMany: jest.fn(),
              findUnique: jest.fn<() => Promise<typeof team>>().mockResolvedValue(team),
              update: jest.fn(),
            },
            playerAvailability: {
              findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
              upsert: jest.fn((args: unknown) => ({ upsert: args })),
              deleteMany: jest.fn((args: unknown) => ({ deleteMany: args })),
            },
            teamScheduleBlock: {
              findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            $transaction: jest.fn((operations: unknown[]) => Promise.resolve(operations)),
          },
        },
      ],
    }).compile();

    service = module.get(TeamScheduleService);
    prisma = module.get(PrismaService);
  });

  it('lists only the teams a player is on, and every team for managers', async () => {
    await service.listTeams(player);
    expect(prisma.rosterGame.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { rosterEntries: { some: { userId: 100 } } } }),
    );

    await service.listTeams(manager);
    expect(prisma.rosterGame.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: undefined }));
  });

  it("shows a player the week of their team, marking their own column", async () => {
    prisma.playerAvailability.findMany.mockResolvedValue([
      { rosterEntryId: 10, date: new Date('2026-11-17T00:00:00.000Z'), hour: 19, status: AvailabilityStatus.AVAILABLE, note: null },
    ]);
    prisma.teamScheduleBlock.findMany.mockResolvedValue([
      { id: 2, type: TeamScheduleBlockType.SCRIM, title: null, date: new Date('2026-11-16T00:00:00.000Z'), startHour: 19, endHour: 21, notes: null },
    ]);

    const week = await service.getWeek(1, player, '2026-11-19');

    expect(week.weekStart).toBe('2026-11-16');
    expect(week.canManage).toBe(false);
    expect(week.players).toEqual([
      { rosterEntryId: 10, handle: 'Rocky', name: 'Robin Claes', isMe: true },
      { rosterEntryId: 11, handle: 'Jorrit', name: null, isMe: false },
    ]);
    expect(week.availability).toEqual([{ rosterEntryId: 10, date: '2026-11-17', hour: 19, status: 'AVAILABLE', note: null }]);
    expect(week.blocks[0]).toEqual(expect.objectContaining({ date: '2026-11-16', startHour: 19, endHour: 21 }));
    expect(prisma.playerAvailability.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          rosterEntryId: { in: [10, 11] },
          date: { gte: new Date('2026-11-16T00:00:00.000Z'), lt: new Date('2026-11-23T00:00:00.000Z') },
        },
      }),
    );
  });

  it('keeps the schedule from people outside the team', async () => {
    await expect(service.getWeek(1, outsider)).rejects.toThrow(ForbiddenException);
    await expect(service.getWeek(1, manager)).resolves.toEqual(expect.objectContaining({ canManage: true }));
  });

  it('saves and clears a player’s own cells', async () => {
    await service.updateAvailability(1, player, {
      cells: [
        { date: '2026-11-17', hour: 19, status: AvailabilityStatus.AVAILABLE, note: ' vanaf 19:30 ' },
        { date: '2026-11-17', hour: 20, status: null },
      ],
    });

    const key = { rosterEntryId: 10, date: new Date('2026-11-17T00:00:00.000Z') };
    expect(prisma.playerAvailability.upsert).toHaveBeenCalledWith({
      where: { rosterEntryId_date_hour: { ...key, hour: 19 } },
      create: { ...key, hour: 19, status: 'AVAILABLE', note: 'vanaf 19:30' },
      update: { status: 'AVAILABLE', note: 'vanaf 19:30' },
    });
    expect(prisma.playerAvailability.deleteMany).toHaveBeenCalledWith({ where: { ...key, hour: 20 } });
  });

  it('keeps an existing note when only the status changes', async () => {
    await service.updateAvailability(1, player, { cells: [{ date: '2026-11-17', hour: 19, status: AvailabilityStatus.UNAVAILABLE }] });
    expect(prisma.playerAvailability.upsert.mock.calls[0][0].update).toEqual({ status: 'UNAVAILABLE' });
  });

  it("lets only managers fill in someone else's availability", async () => {
    const cells = [{ date: '2026-11-17', hour: 19, status: AvailabilityStatus.AVAILABLE }];
    await expect(service.updateAvailability(1, player, { rosterEntryId: 11, cells })).rejects.toThrow(ForbiddenException);
    await expect(service.updateAvailability(1, outsider, { cells })).rejects.toThrow(ForbiddenException);

    await service.updateAvailability(1, manager, { rosterEntryId: 11, cells });
    expect(prisma.playerAvailability.upsert.mock.calls[0][0].create.rosterEntryId).toBe(11);
  });

  it('refuses hours outside the team grid and players from another team', async () => {
    await expect(
      service.updateAvailability(1, player, { cells: [{ date: '2026-11-17', hour: 23, status: AvailabilityStatus.AVAILABLE }] }),
    ).rejects.toThrow(BadRequestException);
    await expect(service.updateAvailability(1, manager, { rosterEntryId: 55, cells: [] })).rejects.toThrow(NotFoundException);
    await expect(service.updateAvailability(1, manager, { cells: [] })).rejects.toThrow(BadRequestException); // not a player
  });

  it('plans a block and refuses one that ends before it starts', async () => {
    await service.createBlock(1, { type: TeamScheduleBlockType.SCRIM, title: ' vs KdG ', date: '2026-11-16', startHour: 19, endHour: 21 });
    expect(prisma.teamScheduleBlock.create).toHaveBeenCalledWith({
      data: { gameId: 1, type: 'SCRIM', title: 'vs KdG', date: new Date('2026-11-16T00:00:00.000Z'), startHour: 19, endHour: 21, notes: null },
    });

    await expect(
      service.createBlock(1, { type: TeamScheduleBlockType.SCRIM, date: '2026-11-16', startHour: 21, endHour: 19 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('checks the hours of an edited block against what it already has', async () => {
    prisma.teamScheduleBlock.findUnique.mockResolvedValue({ id: 2, startHour: 19, endHour: 21 });
    await expect(service.updateBlock(2, { startHour: 22 })).rejects.toThrow(BadRequestException);
    await service.updateBlock(2, { endHour: 22 });
    expect(prisma.teamScheduleBlock.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2 }, data: expect.objectContaining({ endHour: 22 }) }));
  });
});
