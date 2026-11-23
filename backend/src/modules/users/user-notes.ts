import { UserNoteType } from '../../generated/prisma/enums.js';
import type { ActiveUserNoteDto } from '../../dtos/users/user.dto.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/** Notes that still count at `now`: open-ended ones and ones that end later. */
export function activeNoteFilter(now = new Date()) {
  return { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

/** Most serious first: a block, then warnings, then plain notes. */
const SEVERITY: Record<UserNoteType, number> = { BLOCK: 0, WARNING: 1, NOTE: 2 };

export function bySeverity<T extends { type: UserNoteType; createdAt: Date }>(a: T, b: T) {
  return SEVERITY[a.type] - SEVERITY[b.type] || b.createdAt.getTime() - a.createdAt.getTime();
}

/** The block that keeps someone off the site right now, if any; the one that lasts longest when there are several. */
export async function findActiveBlock(prisma: PrismaService, userId: number, now = new Date()) {
  const blocks = await prisma.userNote.findMany({
    where: { userId, type: UserNoteType.BLOCK, ...activeNoteFilter(now) },
    select: { id: true, expiresAt: true },
  });
  if (blocks.length === 0) return null;
  // An open-ended block outlasts any block with an end date
  return blocks.find((block) => block.expiresAt === null) ?? blocks.reduce((a, b) => (a.expiresAt! > b.expiresAt! ? a : b));
}

/** The notes that still count for each of these users, most serious first. */
export async function findActiveNotesByUser(prisma: PrismaService, userIds: number[], now = new Date()) {
  const byUser = new Map<number, ActiveUserNoteDto[]>();
  if (userIds.length === 0) return byUser;

  const notes = await prisma.userNote.findMany({
    where: { userId: { in: [...new Set(userIds)] }, ...activeNoteFilter(now) },
    include: { author: { select: { name: true } } },
  });

  for (const note of notes.sort(bySeverity)) {
    const list = byUser.get(note.userId) ?? [];
    list.push({
      id: note.id,
      type: note.type,
      content: note.content,
      authorName: note.author.name,
      createdAt: note.createdAt,
      expiresAt: note.expiresAt,
    });
    byUser.set(note.userId, list);
  }
  return byUser;
}
