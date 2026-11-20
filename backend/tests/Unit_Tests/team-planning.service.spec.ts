import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeamPlanningService, parseDateKey } from '../../src/modules/team-planning/team-planning.service.js';
import { AvailabilityStatus, PlanningBlockType } from '../../src/generated/prisma/enums.js';

const fn = () => jest.fn<(...args: any[]) => any>();

// Team 1: Robin (user 100) plays, Jamie (user 200) manages, Sam (user 101) plays.
const members = [
  { id: 10, teamId: 1, userId: 100, handle: 'Rocky', isPlayer: true, isManager: false, order: 0, user: { name: 'Robin Claes', email: 'robin@x.be' } },
  { id: 11, teamId: 1, userId: 101, handle: null, isPlayer: true, isManager: false, order: 1, user: { name: null, email: 'sam@x.be' } },
  { id: 12, teamId: 1, userId: 200, handle: null, isPlayer: false, isManager: true, order: 2, user: { name: 'Jamie', email: 'jamie@x.be' } },
];

const player = { userId: 100, isPlanningAdmin: false };
const manager = { userId: 200, isPlanningAdmin: false };
const admin = { userId: 999, isPlanningAdmin: true };
const outsider = { userId: 555, isPlanningAdmin: false };

describe('TeamPlanningService', () => {
  let prisma: any;
  let people: any;
  let service: TeamPlanningService;

  beforeEach(() => {
    const memberOf = ({ where }: any) =>
      Promise.resolve(members.find((m) => m.teamId === where.teamId_userId?.teamId && m.userId === where.teamId_userId?.userId) ?? null);

    prisma = {
      planningTeam: {
        findUnique: fn().mockImplementation(({ where, include }: any) =>
          Promise.resolve(where.id === 1 ? { id: 1, name: 'AP Valorant', game: 'Valorant', ...(include ? { members } : {}) } : null),
        ),
        findUniqueOrThrow: fn().mockResolvedValue({ id: 1, name: 'AP Valorant', game: 'Valorant', _count: { members: 2, days: 3 } }),
        findMany: fn().mockResolvedValue([{ id: 1 }]),
        create: fn().mockResolvedValue({ id: 1 }),
        update: fn(),
        delete: fn(),
      },
      planningTeamMember: {
        findMany: fn().mockImplementation(({ where }: any) => Promise.resolve(members.filter((m) => !where.teamId || m.teamId === where.teamId))),
        findUnique: fn().mockImplementation((args: any) =>
          args.where.id !== undefined ? Promise.resolve(members.find((m) => m.id === args.where.id) ?? null) : memberOf(args),
        ),
        count: fn().mockResolvedValue(0),
        aggregate: fn().mockResolvedValue({ _max: { order: 2 } }),
        create: fn(),
        update: fn(),
        delete: fn(),
      },
      planningDay: {
        findMany: fn().mockResolvedValue([{ id: 7, date: new Date('2026-11-23T00:00:00.000Z'), startHour: 13, endHour: 23, note: null, blocks: [] }]),
        findUnique: fn(),
        count: fn().mockResolvedValue(1),
        createMany: fn().mockResolvedValue({ count: 2 }),
        update: fn(),
        delete: fn(),
      },
      planningAvailability: {
        findMany: fn().mockResolvedValue([]),
        upsert: fn().mockImplementation((args: any) => ({ upsert: args })),
        deleteMany: fn().mockImplementation((args: any) => ({ deleteMany: args })),
        groupBy: fn().mockResolvedValue([]),
      },
      planningBlock: { findUnique: fn(), create: fn(), update: fn(), delete: fn() },
      $transaction: fn().mockImplementation((ops: unknown[]) => Promise.resolve(ops)),
    };
    people = { findOrCreate: fn().mockResolvedValue({ id: 300, name: 'New Player', email: 'new@x.be' }), search: fn().mockResolvedValue([]) };
    service = new TeamPlanningService(prisma, people);
  });

  describe('players', () => {
    it("lists the player's teams with the days they still have to fill in", async () => {
      prisma.planningTeamMember.findMany.mockResolvedValueOnce([{ id: 10, teamId: 1 }]);

      await expect(service.myTeams(player)).resolves.toEqual([
        { id: 1, name: 'AP Valorant', game: 'Valorant', playerCount: 2, upcomingDays: 3, daysToFill: 1 },
      ]);
      expect(prisma.planningDay.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ teamId: 1, availability: { none: { memberId: 10 } } }),
      });
    });

    it('shows players the upcoming days with a column per player', async () => {
      const view = await service.teamView(1, player);

      expect(view.myMemberId).toBe(10);
      expect(view.canManage).toBe(false);
      expect(view.players).toEqual([
        { memberId: 10, label: 'Rocky', name: 'Robin Claes', isMe: true },
        { memberId: 11, label: 'sam', name: null, isMe: false },
      ]);
      expect(prisma.planningDay.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { date: 'asc' } }));
    });

    it('lets the team manager see the planning, but not people outside the team', async () => {
      await expect(service.teamView(1, manager)).resolves.toEqual(expect.objectContaining({ canManage: true, myMemberId: null }));
      await expect(service.teamView(1, outsider)).rejects.toThrow(ForbiddenException);
      await expect(service.teamView(2, admin)).rejects.toThrow(NotFoundException);
    });

    it('saves a player’s own cells and clears empty ones', async () => {
      await service.saveAvailability(1, player, {
        cells: [
          { dayId: 7, hour: 19, status: AvailabilityStatus.AVAILABLE, note: ' vanaf 19:30 ' },
          { dayId: 7, hour: 20, status: null },
        ],
      });

      expect(prisma.planningAvailability.upsert).toHaveBeenCalledWith({
        where: { dayId_memberId_hour: { dayId: 7, memberId: 10, hour: 19 } },
        create: { dayId: 7, memberId: 10, hour: 19, status: 'AVAILABLE', note: 'vanaf 19:30' },
        update: { status: 'AVAILABLE', note: 'vanaf 19:30' },
      });
      expect(prisma.planningAvailability.deleteMany).toHaveBeenCalledWith({ where: { dayId: 7, memberId: 10, hour: 20 } });
    });

    it('keeps the note when only the status changes', async () => {
      await service.saveAvailability(1, player, { cells: [{ dayId: 7, hour: 19, status: AvailabilityStatus.UNAVAILABLE }] });
      expect(prisma.planningAvailability.upsert.mock.calls[0][0].update).toEqual({ status: 'UNAVAILABLE' });
    });

    it("lets only managers fill in someone else's availability", async () => {
      const cells = [{ dayId: 7, hour: 19, status: AvailabilityStatus.AVAILABLE }];
      await expect(service.saveAvailability(1, player, { memberId: 11, cells })).rejects.toThrow(ForbiddenException);
      await expect(service.saveAvailability(1, manager, { cells })).rejects.toThrow(BadRequestException); // not a player
      await service.saveAvailability(1, manager, { memberId: 11, cells });
      expect(prisma.planningAvailability.upsert.mock.calls[0][0].create.memberId).toBe(11);
    });

    it('refuses hours outside the planned day and days of another team', async () => {
      await expect(
        service.saveAvailability(1, player, { cells: [{ dayId: 7, hour: 23, status: AvailabilityStatus.AVAILABLE }] }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.saveAvailability(1, player, { cells: [{ dayId: 99, hour: 19, status: AvailabilityStatus.AVAILABLE }] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('managers', () => {
    it('lists only the teams someone manages, and every team for planning admins', async () => {
      await service.adminTeams(manager);
      expect(prisma.planningTeam.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { members: { some: { userId: 200, isManager: true } } } }),
      );
      await service.adminTeams(admin);
      expect(prisma.planningTeam.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: undefined }));
    });

    it('keeps players and outsiders out of team management', async () => {
      await expect(service.teamDetail(1, player)).rejects.toThrow(ForbiddenException);
      await expect(service.addDays(1, outsider, { dates: ['2026-11-23'], startHour: 13, endHour: 23 })).rejects.toThrow(ForbiddenException);
      await expect(service.searchPeople(player, 'rob')).rejects.toThrow(ForbiddenException);
    });

    it('lets only planning admins create and delete teams', async () => {
      await expect(service.createTeam(manager, { name: 'New' })).rejects.toThrow(ForbiddenException);
      await expect(service.deleteTeam(1, manager)).rejects.toThrow(ForbiddenException);
      await service.createTeam(admin, { name: ' New team ', game: '' });
      expect(prisma.planningTeam.create).toHaveBeenCalledWith({ data: { name: 'New team', game: null } });
    });

    it('adds a player at the end of the team', async () => {
      await service.addMember(1, manager, { email: 'new@x.be', name: 'New Player', handle: ' Nova ' });

      expect(people.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@x.be', name: 'New Player' }));
      expect(prisma.planningTeamMember.create).toHaveBeenCalledWith({
        data: { teamId: 1, userId: 300, handle: 'Nova', isPlayer: true, isManager: false, order: 3 },
      });
    });

    it('refuses someone already on the team', async () => {
      people.findOrCreate.mockResolvedValue({ id: 101, name: null, email: 'sam@x.be' });
      await expect(service.addMember(1, manager, { userId: 101 })).rejects.toThrow(ConflictException);
    });

    it('lets only planning admins assign or remove managers', async () => {
      await expect(service.addMember(1, manager, { userId: 300, isManager: true })).rejects.toThrow(ForbiddenException);
      await expect(service.updateMember(10, manager, { isManager: true })).rejects.toThrow(ForbiddenException);
      await expect(service.removeMember(12, manager)).rejects.toThrow(ForbiddenException);

      await service.updateMember(10, manager, { handle: 'R0cky' });
      await service.removeMember(11, manager);
      await service.updateMember(10, admin, { isManager: true });
      expect(prisma.planningTeamMember.update).toHaveBeenLastCalledWith({
        where: { id: 10 },
        data: { handle: undefined, isPlayer: undefined, isManager: true },
      });
      expect(prisma.planningTeamMember.delete).toHaveBeenCalledWith({ where: { id: 11 } });
    });

    it('plans several dates at once and skips ones already planned', async () => {
      await expect(
        service.addDays(1, manager, { dates: ['2026-11-23', '2026-11-24', '2026-11-24', '2026-11-25'], startHour: 18, endHour: 23 }),
      ).resolves.toEqual({ added: 2, skipped: 1 });

      const { data, skipDuplicates } = prisma.planningDay.createMany.mock.calls[0][0];
      expect(skipDuplicates).toBe(true);
      expect(data).toHaveLength(3);
      expect(data[0]).toEqual({ teamId: 1, date: parseDateKey('2026-11-23'), startHour: 18, endHour: 23, note: null });
    });

    it('refuses days that end before they start or do not exist', async () => {
      await expect(service.addDays(1, manager, { dates: ['2026-11-23'], startHour: 20, endHour: 18 })).rejects.toThrow(BadRequestException);
      await expect(service.addDays(1, manager, { dates: ['2026-02-30'], startHour: 13, endHour: 23 })).rejects.toThrow(BadRequestException);
    });

    it('drops availability outside new day hours, but not blocks', async () => {
      prisma.planningDay.findUnique.mockResolvedValue({ id: 7, teamId: 1, startHour: 13, endHour: 23, blocks: [{ startHour: 19, endHour: 21 }] });

      await service.updateDay(7, manager, { startHour: 16, endHour: 22 });
      expect(prisma.planningAvailability.deleteMany).toHaveBeenCalledWith({
        where: { dayId: 7, OR: [{ hour: { lt: 16 } }, { hour: { gte: 22 } }] },
      });

      await expect(service.updateDay(7, manager, { startHour: 20 })).rejects.toThrow(BadRequestException);
    });

    it("plans a block within the day's hours", async () => {
      prisma.planningDay.findUnique.mockResolvedValue({ id: 7, teamId: 1, startHour: 18, endHour: 23 });

      await service.addBlock(7, manager, { type: PlanningBlockType.SCRIM, title: ' vs KdG ', startHour: 19, endHour: 21 });
      expect(prisma.planningBlock.create).toHaveBeenCalledWith({
        data: { dayId: 7, type: 'SCRIM', title: 'vs KdG', startHour: 19, endHour: 21, notes: null },
      });

      await expect(service.addBlock(7, manager, { type: PlanningBlockType.SCRIM, startHour: 15, endHour: 17 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
