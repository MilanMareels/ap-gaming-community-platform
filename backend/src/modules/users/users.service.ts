import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { ReservationStatus } from '../../dtos/reservations/reservation.dto.js';
import {
  UserNoteType,
  type CreateWhitelistDto,
  type CreateUserNoteDto,
  type UpdateUserDto,
  type UpdateUserNoteDto,
  type UserDetailDto,
  type UserListResponseDto,
  type UserNoteDto,
} from '../../dtos/users/user.dto.js';
import { describeAudit } from '../audit/audit-context.js';
import { HUB_TIME_ZONE } from '../../common/wall-clock.js';
import { activeNoteFilter } from './user-notes.js';

const WHITELIST_PREFIX = 'admin_whitelist.';

type NoteRow = {
  id: number;
  type: UserNoteType;
  content: string;
  expiresAt: Date | null;
  emailedAt: Date | null;
  authorId: number;
  author: { name: string | null };
  createdAt: Date;
  updatedAt: Date;
};

const toNoteDto = (note: NoteRow): UserNoteDto => ({
  id: note.id,
  type: note.type,
  content: note.content,
  expiresAt: note.expiresAt,
  emailedAt: note.emailedAt,
  authorId: note.authorId,
  authorName: note.author.name,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
});

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async list(args: { search?: string; adminOnly?: boolean; noShowsOnly?: boolean; page?: number; pageSize?: number }): Promise<UserListResponseDto> {
    const pageSize = args.pageSize ?? 25;

    const where: Record<string, unknown> = {};

    if (args.search) {
      where.OR = [
        { name: { contains: args.search, mode: 'insensitive' } },
        { email: { contains: args.search, mode: 'insensitive' } },
        { sNumber: { contains: args.search, mode: 'insensitive' } },
      ];
    }

    if (args.adminOnly) {
      where.userRoles = { some: { role: { name: 'Admin' } } };
    }

    if (args.noShowsOnly) {
      where.reservations = { some: { status: ReservationStatus.NO_SHOW } };
    }

    const total = await this.prisma.user.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    // Clamp so a stale page number (e.g. after deleting the last user on the last page) still returns results
    const page = Math.min(args.page ?? 1, totalPages);

    const users = await this.prisma.user.findMany({
      where,
      include: {
        googleSSOUsers: { select: { id: true } },
        microsoftSSOUsers: { select: { id: true } },
        userRoles: { select: { role: { select: { name: true } } } },
        _count: {
          select: {
            reservations: true,
          },
        },
      },
      orderBy: { id: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const noShowCounts = await this.prisma.reservation.groupBy({
      by: ['userId'],
      where: { userId: { in: users.map((u) => u.id) }, status: ReservationStatus.NO_SHOW },
      _count: { _all: true },
    });
    const noShowMap = new Map(noShowCounts.map((entry) => [entry.userId, entry._count._all]));

    const blocks = await this.prisma.userNote.findMany({
      where: { userId: { in: users.map((u) => u.id) }, type: UserNoteType.BLOCK, ...activeNoteFilter() },
      select: { userId: true },
    });
    const blocked = new Set(blocks.map((block) => block.userId));

    const items = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      sNumber: user.sNumber,
      isAdmin: user.userRoles.some((ur) => ur.role.name === 'Admin'),
      googleLinked: user.googleSSOUsers.length > 0,
      microsoftLinked: user.microsoftSSOUsers.length > 0,
      reservationCount: user._count.reservations,
      noShowCount: noShowMap.get(user.id) ?? 0,
      roles: user.userRoles.map((ur) => ur.role.name),
      isBlocked: blocked.has(user.id),
    }));

    return { items, total, page, pageSize, totalPages };
  }

  async getById(id: number): Promise<UserDetailDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: { select: { role: { select: { name: true } } } },
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
        notesAbout: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { name: true } } },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const [reservationCount, noShowCount] = await Promise.all([
      this.prisma.reservation.count({ where: { userId: id } }),
      this.prisma.reservation.count({ where: { userId: id, status: ReservationStatus.NO_SHOW } }),
    ]);

    const notes = user.notesAbout.map(toNoteDto);
    const now = new Date();
    const activeBlocks = notes.filter((note) => note.type === UserNoteType.BLOCK && (note.expiresAt === null || note.expiresAt > now));
    // The block that ends last is the one that keeps them out: open-ended beats any end date
    const activeBlock = activeBlocks.sort((a, b) => (b.expiresAt?.getTime() ?? Infinity) - (a.expiresAt?.getTime() ?? Infinity))[0] ?? null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      sNumber: user.sNumber,
      isAdmin: user.userRoles.some((ur) => ur.role.name === 'Admin'),
      googleLinks: user.googleSSOUsers,
      microsoftLinks: user.microsoftSSOUsers,
      reservationCount,
      noShowCount,
      recentReservations: user.reservations,
      notes,
      activeBlock,
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

    // The database deletes the user's reservations, roles, notes and registrations along with them,
    // out of sight of the audit log: keep a summary of what went
    const [user, reservations, roles] = await Promise.all([
      this.prisma.user.findUnique({ where: { id }, select: { email: true, name: true, sNumber: true } }),
      this.prisma.reservation.count({ where: { userId: id } }),
      this.prisma.userRole.findMany({ where: { userId: id }, select: { role: { select: { name: true } } } }),
    ]);
    describeAudit({ deletedUser: user, reservationsDeleted: reservations, roles: roles.map((r) => r.role.name) });

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

  /**
   * Adds a note about a user. A block (BLOCK) needs users.block and keeps the user off the site while it
   * counts; a warning is e-mailed to the user when staff ask for it. A failed e-mail leaves emailedAt empty.
   */
  async createNote(userId: number, authorId: number, dto: CreateUserNoteDto, permissions: Set<string>): Promise<UserNoteDto> {
    await this.assertExists(userId);
    const type = dto.type ?? UserNoteType.NOTE;
    const expiresAt = this.parseExpiry(dto.expiresAt);
    if (type === UserNoteType.BLOCK) await this.assertMayBlock(userId, authorId, permissions);
    if (dto.sendEmail && type !== UserNoteType.WARNING) throw new BadRequestException('Alleen een waarschuwing kan gemaild worden.');

    const note = await this.prisma.userNote.create({
      data: { userId, authorId, type, content: dto.content.trim(), expiresAt },
      include: { author: { select: { name: true } } },
    });

    return toNoteDto(dto.sendEmail ? await this.emailWarning(note) : note);
  }

  /** Edits a note or ends it now. Others' notes need users.notes.delete_others, anything about a block needs users.block. */
  async updateNote(userId: number, noteId: number, currentUserId: number, dto: UpdateUserNoteDto, permissions: Set<string>): Promise<UserNoteDto> {
    const note = await this.findNoteOf(userId, noteId, currentUserId, permissions);
    const type = dto.type ?? note.type;

    if (note.type === UserNoteType.BLOCK || type === UserNoteType.BLOCK) {
      await this.assertMayBlock(userId, currentUserId, permissions, note.type === UserNoteType.BLOCK);
    }

    let expiresAt: Date | null | undefined;
    if (dto.end) {
      // Ending a note that already ended keeps the moment it ended
      expiresAt = note.expiresAt && note.expiresAt <= new Date() ? note.expiresAt : new Date();
    } else if (dto.expiresAt !== undefined) {
      expiresAt = this.parseExpiry(dto.expiresAt);
    }

    if (dto.sendEmail) {
      if (type !== UserNoteType.WARNING) throw new BadRequestException('Alleen een waarschuwing kan gemaild worden.');
      if (note.emailedAt) throw new BadRequestException('Deze waarschuwing is al gemaild.');
    }

    const updated = await this.prisma.userNote.update({
      where: { id: noteId },
      data: { type, content: dto.content?.trim(), expiresAt },
      include: { author: { select: { name: true } } },
    });
    return toNoteDto(dto.sendEmail ? await this.emailWarning(updated) : updated);
  }

  async deleteNote(userId: number, noteId: number, currentUserId: number, permissions: Set<string>) {
    const note = await this.findNoteOf(userId, noteId, currentUserId, permissions);
    if (note.type === UserNoteType.BLOCK && !permissions.has('users.block')) {
      throw new ForbiddenException('Je hebt geen recht om blokkeringen te beheren.');
    }

    await this.prisma.userNote.delete({ where: { id: noteId } });
    return { success: true };
  }

  private async findNoteOf(userId: number, noteId: number, currentUserId: number, permissions: Set<string>) {
    const note = await this.prisma.userNote.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== userId) throw new NotFoundException('Note not found');
    if (note.authorId !== currentUserId && !permissions.has('users.notes.delete_others')) {
      throw new ForbiddenException('Je kan alleen je eigen notities wijzigen of verwijderen.');
    }
    return note;
  }

  /** Who may be blocked: not yourself and not an admin. Changing or lifting an existing block only needs the permission. */
  private async assertMayBlock(userId: number, currentUserId: number, permissions: Set<string>, existingBlock = false) {
    if (!permissions.has('users.block')) throw new ForbiddenException('Je hebt geen recht om gebruikers te blokkeren.');
    if (existingBlock) return;
    if (userId === currentUserId) throw new BadRequestException('Je kan jezelf niet blokkeren.');
    const admin = await this.prisma.userRole.findFirst({ where: { userId, role: { name: 'Admin' } }, select: { id: true } });
    if (admin) throw new BadRequestException('Een admin kan niet geblokkeerd worden. Neem eerst de Admin-rol af.');
  }

  /** undefined keeps the current end, null makes the note open-ended; an end must lie in the future. */
  private parseExpiry(value: string | null | undefined): Date | null {
    if (value === undefined || value === null) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Ongeldige einddatum.');
    if (date <= new Date()) throw new BadRequestException('De einddatum moet in de toekomst liggen.');
    return date;
  }

  /** E-mails a warning to the person it is about and records when; on failure the note stays as it was. */
  private async emailWarning(note: NoteRow & { userId: number }): Promise<NoteRow> {
    const user = await this.prisma.user.findUnique({ where: { id: note.userId }, select: { email: true, name: true, sNumber: true } });
    if (!user) return note;
    try {
      await this.mailService.sendMail(user.email, 'Waarschuwing - AP Gaming Hub', 'users/warning', {
        name: user.name ?? (user.sNumber !== 'N/A' ? user.sNumber : 'gamer'),
        content: note.content,
        expiresAt: note.expiresAt
          ? new Intl.DateTimeFormat('nl-BE', { dateStyle: 'long', timeStyle: 'short', timeZone: HUB_TIME_ZONE }).format(note.expiresAt)
          : null,
        rulesUrl: `${process.env.FRONTEND_URL}/info`,
      });
    } catch (error) {
      // The warning is saved either way; the empty emailedAt tells staff the mail did not go out
      this.logger.error(`Failed to send warning email: ${error instanceof Error ? error.message : String(error)}`);
      describeAudit({ warningEmailFailedTo: user.email });
      return note;
    }
    describeAudit({ warningEmailedTo: user.email });
    return this.prisma.userNote.update({
      where: { id: note.id },
      data: { emailedAt: new Date() },
      include: { author: { select: { name: true } } },
    });
  }

  private async assertExists(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
  }
}
