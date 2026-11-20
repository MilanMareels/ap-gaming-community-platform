import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PeopleService } from '../people/people.service.js';
import { wallClockNow } from '../../common/wall-clock.js';
import {
  AddPlanningDaysDto,
  AddPlanningMemberDto,
  CreatePlanningBlockDto,
  CreatePlanningTeamDto,
  PlanningAddDaysResultDto,
  PlanningTeamDetailDto,
  PlanningTeamSummaryDto,
  PlanningTeamViewDto,
  SaveAvailabilityDto,
  UpdatePlanningBlockDto,
  UpdatePlanningDayDto,
  UpdatePlanningMemberDto,
  UpdatePlanningTeamDto,
} from '../../dtos/team-planning/team-planning.dto.js';

/** Lets someone manage every planning team: create and delete teams and assign their managers. */
export const PLANNING_ADMIN_PERMISSION = 'esports.schedule.manage';

/** Who is asking. */
export interface PlanningViewer {
  userId: number;
  isPlanningAdmin: boolean;
}

/** A calendar date (stored as midnight UTC in @db.Date columns) from YYYY-MM-DD. */
export function parseDateKey(key: string): Date {
  const date = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== key) {
    throw new BadRequestException(`Invalid date: ${key}`);
  }
  return date;
}

export const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

/** Today in the hub's timezone, as a @db.Date value. */
function today(): Date {
  const now = wallClockNow();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const trimOrNull = (value: string | null | undefined) => (value === undefined ? undefined : value?.trim() || null);

type MemberWithUser = { handle: string | null; user: { name: string | null; email: string } };

/** What to show above a player's column: their handle, else their name, else their email. */
const memberLabel = (member: MemberWithUser) => member.handle?.trim() || member.user.name?.trim() || member.user.email.split('@')[0];

@Injectable()
export class TeamPlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly people: PeopleService,
  ) {}

  // ── Players ──────────────────────────────────────────

  /** The teams the signed-in user plays in, with how many upcoming days they still have to fill in. */
  async myTeams(viewer: PlanningViewer): Promise<PlanningTeamSummaryDto[]> {
    const memberships = await this.prisma.planningTeamMember.findMany({
      where: { userId: viewer.userId, isPlayer: true },
      select: { id: true, teamId: true },
      orderBy: { team: { name: 'asc' } },
    });

    return Promise.all(memberships.map((membership) => this.summarize(membership.teamId, membership.id)));
  }

  /** The grid of a team's planned days: for its players, its managers and planning admins. */
  async teamView(teamId: number, viewer: PlanningViewer, past = false): Promise<PlanningTeamViewDto> {
    const team = await this.prisma.planningTeam.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!team) throw new NotFoundException('Team not found');

    const me = team.members.find((member) => member.userId === viewer.userId);
    const canManage = viewer.isPlanningAdmin || !!me?.isManager;
    if (!me?.isPlayer && !canManage) throw new ForbiddenException('Only players of this team can see its planning');

    const players = team.members.filter((member) => member.isPlayer);
    const days = await this.prisma.planningDay.findMany({
      where: { teamId, date: past ? { lt: today() } : { gte: today() } },
      orderBy: { date: past ? 'desc' : 'asc' },
      take: past ? 14 : 60,
      include: { blocks: { orderBy: { startHour: 'asc' } } },
    });
    const availability = await this.prisma.planningAvailability.findMany({
      where: { dayId: { in: days.map((day) => day.id) }, memberId: { in: players.map((player) => player.id) } },
      select: { dayId: true, memberId: true, hour: true, status: true, note: true },
    });

    return {
      team: await this.summarize(teamId, me?.isPlayer ? me.id : null),
      myMemberId: me?.isPlayer ? me.id : null,
      canManage,
      players: players.map((player) => ({
        memberId: player.id,
        label: memberLabel(player),
        name: player.user.name,
        isMe: player.userId === viewer.userId,
      })),
      days: days.map((day) => ({
        id: day.id,
        date: toDateKey(day.date),
        startHour: day.startHour,
        endHour: day.endHour,
        note: day.note,
        blocks: day.blocks.map(({ dayId: _dayId, ...block }) => block),
      })),
      availability,
    };
  }

  /** Saves changed cells for one player: your own, or anyone's on a team you manage. */
  async saveAvailability(teamId: number, viewer: PlanningViewer, dto: SaveAvailabilityDto) {
    const members = await this.prisma.planningTeamMember.findMany({ where: { teamId } });
    const me = members.find((member) => member.userId === viewer.userId);
    const canManage = viewer.isPlanningAdmin || !!me?.isManager;

    const memberId = dto.memberId ?? (me?.isPlayer ? me.id : undefined);
    if (memberId === undefined) throw new BadRequestException('You are not a player on this team');
    const target = members.find((member) => member.id === memberId && member.isPlayer);
    if (!target) throw new NotFoundException('Player not found on this team');
    if (target.userId !== viewer.userId && !canManage) throw new ForbiddenException('You can only fill in your own availability');

    const days = await this.prisma.planningDay.findMany({
      where: { teamId, id: { in: [...new Set(dto.cells.map((cell) => cell.dayId))] } },
      select: { id: true, startHour: true, endHour: true },
    });
    for (const cell of dto.cells) {
      const day = days.find((d) => d.id === cell.dayId);
      if (!day) throw new NotFoundException('Day not found on this team');
      if (cell.hour < day.startHour || cell.hour >= day.endHour) throw new BadRequestException(`Hour ${cell.hour} is not planned on this day`);
    }

    await this.prisma.$transaction(
      dto.cells.map((cell) => {
        const key = { dayId: cell.dayId, memberId, hour: cell.hour };
        if (cell.status === null) return this.prisma.planningAvailability.deleteMany({ where: key });
        const note = trimOrNull(cell.note);
        return this.prisma.planningAvailability.upsert({
          where: { dayId_memberId_hour: key },
          create: { ...key, status: cell.status, note: note ?? null },
          update: { status: cell.status, ...(note !== undefined ? { note } : {}) },
        });
      }),
    );
  }

  // ── Managers (admin UI) ──────────────────────────────

  /** Teams the viewer manages; every team for planning admins. */
  async adminTeams(viewer: PlanningViewer): Promise<PlanningTeamSummaryDto[]> {
    const teams = await this.prisma.planningTeam.findMany({
      where: viewer.isPlanningAdmin ? undefined : { members: { some: { userId: viewer.userId, isManager: true } } },
      select: { id: true },
      orderBy: { name: 'asc' },
    });
    return Promise.all(teams.map((team) => this.summarize(team.id, null)));
  }

  async createTeam(viewer: PlanningViewer, dto: CreatePlanningTeamDto) {
    this.requireAdmin(viewer, 'Only planning admins can create teams');
    const team = await this.prisma.planningTeam.create({ data: { name: dto.name.trim(), game: trimOrNull(dto.game) ?? null } });
    return this.summarize(team.id, null);
  }

  async updateTeam(teamId: number, viewer: PlanningViewer, dto: UpdatePlanningTeamDto) {
    await this.requireManager(teamId, viewer);
    await this.prisma.planningTeam.update({ where: { id: teamId }, data: { name: dto.name?.trim(), game: trimOrNull(dto.game) } });
    return this.summarize(teamId, null);
  }

  async deleteTeam(teamId: number, viewer: PlanningViewer) {
    this.requireAdmin(viewer, 'Only planning admins can delete teams');
    await this.requireManager(teamId, viewer);
    await this.prisma.planningTeam.delete({ where: { id: teamId } });
  }

  /** Members and every planned day of a team, for its managers. */
  async teamDetail(teamId: number, viewer: PlanningViewer): Promise<PlanningTeamDetailDto> {
    await this.requireManager(teamId, viewer);

    const [members, days, filled] = await Promise.all([
      this.prisma.planningTeamMember.findMany({
        where: { teamId },
        include: { user: { select: { name: true, email: true, sNumber: true, _count: { select: { microsoftSSOUsers: true } } } } },
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.planningDay.findMany({
        where: { teamId },
        orderBy: { date: 'asc' },
        include: { blocks: { orderBy: { startHour: 'asc' } } },
      }),
      this.prisma.planningAvailability.groupBy({ by: ['dayId', 'memberId'], where: { day: { teamId } } }),
    ]);

    return {
      team: await this.summarize(teamId, null),
      isPlanningAdmin: viewer.isPlanningAdmin,
      members: members.map((member) => ({
        id: member.id,
        userId: member.userId,
        name: member.user.name,
        email: member.user.email,
        sNumber: member.user.sNumber,
        handle: member.handle,
        isPlayer: member.isPlayer,
        isManager: member.isManager,
        canSignIn: member.user._count.microsoftSSOUsers > 0,
      })),
      days: days.map((day) => ({
        id: day.id,
        date: toDateKey(day.date),
        startHour: day.startHour,
        endHour: day.endHour,
        note: day.note,
        blocks: day.blocks.map(({ dayId: _dayId, ...block }) => block),
        filledBy: filled.filter((group) => group.dayId === day.id).length,
      })),
    };
  }

  /** Adds someone with an account, or a new person by email, to a team. */
  async addMember(teamId: number, viewer: PlanningViewer, dto: AddPlanningMemberDto) {
    await this.requireManager(teamId, viewer);
    if (dto.isManager) this.requireAdmin(viewer, 'Only planning admins can make someone a manager');

    const user = await this.people.findOrCreate(dto);
    const existing = await this.prisma.planningTeamMember.findUnique({ where: { teamId_userId: { teamId, userId: user.id } } });
    if (existing) throw new ConflictException(`${user.name || user.email} is already on this team`);

    const last = await this.prisma.planningTeamMember.aggregate({ where: { teamId }, _max: { order: true } });
    return this.prisma.planningTeamMember.create({
      data: {
        teamId,
        userId: user.id,
        handle: trimOrNull(dto.handle) ?? null,
        isPlayer: dto.isPlayer ?? true,
        isManager: dto.isManager ?? false,
        order: (last._max.order ?? -1) + 1,
      },
    });
  }

  async updateMember(memberId: number, viewer: PlanningViewer, dto: UpdatePlanningMemberDto) {
    const member = await this.prisma.planningTeamMember.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Member not found');
    await this.requireManager(member.teamId, viewer);
    if (dto.isManager !== undefined && dto.isManager !== member.isManager) {
      this.requireAdmin(viewer, 'Only planning admins can change who manages a team');
    }

    return this.prisma.planningTeamMember.update({
      where: { id: memberId },
      data: { handle: trimOrNull(dto.handle), isPlayer: dto.isPlayer, isManager: dto.isManager },
    });
  }

  async removeMember(memberId: number, viewer: PlanningViewer) {
    const member = await this.prisma.planningTeamMember.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Member not found');
    await this.requireManager(member.teamId, viewer);
    if (member.isManager) this.requireAdmin(viewer, 'Only planning admins can remove a manager');
    await this.prisma.planningTeamMember.delete({ where: { id: memberId } });
  }

  /** Plans one or more dates at once; dates that are already planned are left as they are. */
  async addDays(teamId: number, viewer: PlanningViewer, dto: AddPlanningDaysDto): Promise<PlanningAddDaysResultDto> {
    await this.requireManager(teamId, viewer);
    this.assertHours(dto.startHour, dto.endHour);

    const dates = [...new Set(dto.dates)].map(parseDateKey);
    const { count } = await this.prisma.planningDay.createMany({
      data: dates.map((date) => ({ teamId, date, startHour: dto.startHour, endHour: dto.endHour, note: trimOrNull(dto.note) ?? null })),
      skipDuplicates: true,
    });
    return { added: count, skipped: dates.length - count };
  }

  /** Changes a day's hours or note. Availability outside new hours is dropped; blocks must still fit. */
  async updateDay(dayId: number, viewer: PlanningViewer, dto: UpdatePlanningDayDto) {
    const day = await this.prisma.planningDay.findUnique({ where: { id: dayId }, include: { blocks: true } });
    if (!day) throw new NotFoundException('Day not found');
    await this.requireManager(day.teamId, viewer);

    const startHour = dto.startHour ?? day.startHour;
    const endHour = dto.endHour ?? day.endHour;
    this.assertHours(startHour, endHour);
    if (day.blocks.some((block) => block.startHour < startHour || block.endHour > endHour)) {
      throw new BadRequestException('Move or remove the blocks outside these hours first');
    }

    await this.prisma.$transaction([
      this.prisma.planningAvailability.deleteMany({ where: { dayId, OR: [{ hour: { lt: startHour } }, { hour: { gte: endHour } }] } }),
      this.prisma.planningDay.update({ where: { id: dayId }, data: { startHour, endHour, note: trimOrNull(dto.note) } }),
    ]);
  }

  async removeDay(dayId: number, viewer: PlanningViewer) {
    const day = await this.prisma.planningDay.findUnique({ where: { id: dayId }, select: { teamId: true } });
    if (!day) throw new NotFoundException('Day not found');
    await this.requireManager(day.teamId, viewer);
    await this.prisma.planningDay.delete({ where: { id: dayId } });
  }

  async addBlock(dayId: number, viewer: PlanningViewer, dto: CreatePlanningBlockDto) {
    const day = await this.prisma.planningDay.findUnique({ where: { id: dayId } });
    if (!day) throw new NotFoundException('Day not found');
    await this.requireManager(day.teamId, viewer);
    this.assertWithinDay(day, dto.startHour, dto.endHour);

    return this.prisma.planningBlock.create({
      data: {
        dayId,
        type: dto.type,
        title: trimOrNull(dto.title) ?? null,
        startHour: dto.startHour,
        endHour: dto.endHour,
        notes: trimOrNull(dto.notes) ?? null,
      },
    });
  }

  async updateBlock(blockId: number, viewer: PlanningViewer, dto: UpdatePlanningBlockDto) {
    const block = await this.prisma.planningBlock.findUnique({ where: { id: blockId }, include: { day: true } });
    if (!block) throw new NotFoundException('Block not found');
    await this.requireManager(block.day.teamId, viewer);
    this.assertWithinDay(block.day, dto.startHour ?? block.startHour, dto.endHour ?? block.endHour);

    return this.prisma.planningBlock.update({
      where: { id: blockId },
      data: {
        type: dto.type,
        title: trimOrNull(dto.title),
        startHour: dto.startHour,
        endHour: dto.endHour,
        notes: trimOrNull(dto.notes),
      },
    });
  }

  async removeBlock(blockId: number, viewer: PlanningViewer) {
    const block = await this.prisma.planningBlock.findUnique({ where: { id: blockId }, include: { day: { select: { teamId: true } } } });
    if (!block) throw new NotFoundException('Block not found');
    await this.requireManager(block.day.teamId, viewer);
    await this.prisma.planningBlock.delete({ where: { id: blockId } });
  }

  /** The person search, for anyone who manages a team. */
  async searchPeople(viewer: PlanningViewer, search: string) {
    if (!viewer.isPlanningAdmin) {
      const manages = await this.prisma.planningTeamMember.count({ where: { userId: viewer.userId, isManager: true } });
      if (manages === 0) throw new ForbiddenException('Only team managers can search people');
    }
    return this.people.search(search);
  }

  // ── Helpers ──────────────────────────────────────────

  private async summarize(teamId: number, memberId: number | null): Promise<PlanningTeamSummaryDto> {
    const upcoming = { gte: today() };
    const team = await this.prisma.planningTeam.findUniqueOrThrow({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        game: true,
        _count: { select: { members: { where: { isPlayer: true } }, days: { where: { date: upcoming } } } },
      },
    });
    const daysToFill =
      memberId === null
        ? 0
        : await this.prisma.planningDay.count({ where: { teamId, date: upcoming, availability: { none: { memberId } } } });

    return { id: team.id, name: team.name, game: team.game, playerCount: team._count.members, upcomingDays: team._count.days, daysToFill };
  }

  /** Planning admins manage every team; anyone else only teams they're a manager of. */
  private async requireManager(teamId: number, viewer: PlanningViewer) {
    const team = await this.prisma.planningTeam.findUnique({ where: { id: teamId }, select: { id: true } });
    if (!team) throw new NotFoundException('Team not found');
    if (viewer.isPlanningAdmin) return;

    const member = await this.prisma.planningTeamMember.findUnique({ where: { teamId_userId: { teamId, userId: viewer.userId } } });
    if (!member?.isManager) throw new ForbiddenException('You do not manage this team');
  }

  private requireAdmin(viewer: PlanningViewer, message: string) {
    if (!viewer.isPlanningAdmin) throw new ForbiddenException(message);
  }

  private assertHours(startHour: number, endHour: number) {
    if (startHour < 0 || endHour > 24 || startHour >= endHour) throw new BadRequestException('The end hour must be after the start hour');
  }

  private assertWithinDay(day: { startHour: number; endHour: number }, startHour: number, endHour: number) {
    this.assertHours(startHour, endHour);
    if (startHour < day.startHour || endHour > day.endHour) throw new BadRequestException("A block must fall within the day's hours");
  }
}
