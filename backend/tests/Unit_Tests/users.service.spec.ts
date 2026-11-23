import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UsersService } from '../../src/modules/users/users.service.js';
import { PrismaService } from '../../src/modules/prisma/prisma.service.js';
import { MailService } from '../../src/modules/mail/mail.service.js';

const userRow = (id: number) => ({
  id,
  name: `User ${id}`,
  email: `s${id}@student.ap.be`,
  sNumber: `s${id}`,
  adminUsers: [],
  googleSSOUsers: [],
  microsoftSSOUsers: [{ id }],
  userRoles: [],
  _count: { reservations: 2 },
});

const STAFF = 3;
const noteRow = {
  id: 7,
  userId: 5,
  authorId: STAFF,
  type: 'NOTE',
  content: 'Liet zijn drinkbus open staan',
  expiresAt: null as Date | null,
  emailedAt: null as Date | null,
  createdAt: new Date('2026-11-01T10:00:00Z'),
  updatedAt: new Date('2026-11-01T10:00:00Z'),
  author: { name: 'Staff' },
};
const inAWeek = () => new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;
  let mail: { sendMail: jest.Mock<(...args: unknown[]) => Promise<void>> };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        count: jest.fn(),
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: 5, email: 's5@student.ap.be', name: 'Jamie', sNumber: 's5' }),
      },
      reservation: { groupBy: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]) },
      userRole: { findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(null) },
      userNote: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(async ({ data }: any) => ({
          id: 1,
          emailedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { name: 'Staff' },
          ...data,
        })),
        update: jest.fn(async ({ data }: any) => ({ ...noteRow, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) })),
        delete: jest.fn(),
      },
    };
    mail = { sendMail: jest.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }, { provide: MailService, useValue: mail }],
    }).compile();

    service = module.get(UsersService);
    prisma = module.get(PrismaService);
  });

  describe('list', () => {
    it('should return the requested page with pagination metadata', async () => {
      prisma.user.count.mockResolvedValue(60);
      prisma.user.findMany.mockResolvedValue([userRow(35), userRow(34)]);

      const result = await service.list({ page: 2, pageSize: 25 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 25, take: 25, orderBy: { id: 'desc' } }));
      expect(result).toMatchObject({ total: 60, page: 2, pageSize: 25, totalPages: 3 });
      expect(result.items.map((u) => u.id)).toEqual([35, 34]);
      expect(result.items[0]).toMatchObject({ microsoftLinked: true, reservationCount: 2, noShowCount: 0 });
    });

    it('should default to the first page of 25 users', async () => {
      prisma.user.count.mockResolvedValue(3);

      const result = await service.list({});

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 25 }));
      expect(result).toMatchObject({ page: 1, pageSize: 25, totalPages: 1 });
    });

    it('should clamp a page number past the end to the last page', async () => {
      prisma.user.count.mockResolvedValue(30);

      const result = await service.list({ page: 9, pageSize: 25 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 25, take: 25 }));
      expect(result.page).toBe(2);
    });

    it('should report one empty page when nothing matches', async () => {
      prisma.user.count.mockResolvedValue(0);

      const result = await service.list({ search: 'nobody', page: 3 });

      expect(result).toMatchObject({ items: [], total: 0, page: 1, totalPages: 1 });
    });

    it('should apply the search filter to both the count and the page query', async () => {
      prisma.user.count.mockResolvedValue(0);

      await service.list({ search: 'jamie' });

      const expectedWhere = {
        OR: [
          { name: { contains: 'jamie', mode: 'insensitive' } },
          { email: { contains: 'jamie', mode: 'insensitive' } },
          { sNumber: { contains: 'jamie', mode: 'insensitive' } },
        ],
      };
      expect(prisma.user.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }));
    });
  });

  describe('notes', () => {
    const staff = new Set(['users.view']);
    const blocker = new Set(['users.view', 'users.block']);

    it('should save a plain note that never ends by default', async () => {
      const note = await service.createNote(5, STAFF, { content: '  Vriendelijke gast  ' }, staff);

      expect(prisma.userNote.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: 5, authorId: STAFF, type: 'NOTE', content: 'Vriendelijke gast', expiresAt: null } }),
      );
      expect(note).toMatchObject({ type: 'NOTE', expiresAt: null, authorName: 'Staff' });
    });

    it('should refuse an end date in the past', async () => {
      await expect(service.createNote(5, STAFF, { content: 'x', expiresAt: '2020-01-01T00:00:00Z' }, staff)).rejects.toThrow('toekomst');
    });

    describe('blocks', () => {
      it('should need the users.block permission', async () => {
        await expect(service.createNote(5, STAFF, { content: 'Vandalisme', type: 'BLOCK' }, staff)).rejects.toThrow('blokkeren');
        expect(prisma.userNote.create).not.toHaveBeenCalled();
      });

      it('should block someone with the permission, until the given end', async () => {
        const until = inAWeek();
        await service.createNote(5, STAFF, { content: 'Vandalisme', type: 'BLOCK', expiresAt: until }, blocker);

        expect(prisma.userNote.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ type: 'BLOCK', expiresAt: new Date(until) }) }),
        );
      });

      it('should not let you block yourself', async () => {
        await expect(service.createNote(STAFF, STAFF, { content: 'x', type: 'BLOCK' }, blocker)).rejects.toThrow('jezelf');
      });

      it('should not block an admin', async () => {
        prisma.userRole.findFirst.mockResolvedValue({ id: 1 });
        await expect(service.createNote(5, STAFF, { content: 'x', type: 'BLOCK' }, blocker)).rejects.toThrow('admin');
      });

      it('should need users.block to lift or delete a block, even your own', async () => {
        prisma.userNote.findUnique.mockResolvedValue({ ...noteRow, type: 'BLOCK' });

        await expect(service.updateNote(5, 7, STAFF, { end: true }, staff)).rejects.toThrow('blokkeren');
        await expect(service.deleteNote(5, 7, STAFF, staff)).rejects.toThrow('blokkeringen');
        expect(prisma.userNote.delete).not.toHaveBeenCalled();
      });

      it('should let you lift a block on someone who became admin since', async () => {
        prisma.userNote.findUnique.mockResolvedValue({ ...noteRow, type: 'BLOCK' });
        prisma.userRole.findFirst.mockResolvedValue({ id: 1 });

        await expect(service.updateNote(5, 7, STAFF, { end: true }, blocker)).resolves.toBeDefined();
      });
    });

    describe('warnings', () => {
      it('should not e-mail a warning unless asked to', async () => {
        const note = await service.createNote(5, STAFF, { content: 'Drank open naast de pc', type: 'WARNING' }, staff);
        expect(mail.sendMail).not.toHaveBeenCalled();
        expect(note.emailedAt).toBeNull();
      });

      it('should e-mail a warning when asked to, and record when', async () => {
        const note = await service.createNote(5, STAFF, { content: 'Drank open naast de pc', type: 'WARNING', sendEmail: true }, staff);

        expect(mail.sendMail).toHaveBeenCalledWith(
          's5@student.ap.be',
          expect.stringContaining('Waarschuwing'),
          'users/warning',
          expect.objectContaining({ name: 'Jamie', content: 'Drank open naast de pc', expiresAt: null }),
        );
        expect(note.emailedAt).toBeInstanceOf(Date);
      });

      it('should refuse to e-mail a plain note or a block', async () => {
        await expect(service.createNote(5, STAFF, { content: 'Intern', type: 'NOTE', sendEmail: true }, staff)).rejects.toThrow('waarschuwing');
        await expect(service.createNote(5, STAFF, { content: 'x', type: 'BLOCK', sendEmail: true }, blocker)).rejects.toThrow('waarschuwing');
        expect(prisma.userNote.create).not.toHaveBeenCalled();
        expect(mail.sendMail).not.toHaveBeenCalled();
      });

      it('should keep the warning, not marked as e-mailed, when the e-mail fails', async () => {
        mail.sendMail.mockRejectedValue(new Error('SMTP down'));
        const note = await service.createNote(5, STAFF, { content: 'x', type: 'WARNING', sendEmail: true }, staff);
        expect(note).toMatchObject({ type: 'WARNING', emailedAt: null });
      });

      it('should e-mail an existing warning later, but only once', async () => {
        prisma.userNote.findUnique.mockResolvedValue({ ...noteRow, type: 'WARNING', emailedAt: null });
        const note = await service.updateNote(5, 7, STAFF, { sendEmail: true }, staff);
        expect(mail.sendMail).toHaveBeenCalledTimes(1);
        expect(note.emailedAt).toBeInstanceOf(Date);

        prisma.userNote.findUnique.mockResolvedValue({ ...noteRow, type: 'WARNING', emailedAt: new Date() });
        await expect(service.updateNote(5, 7, STAFF, { sendEmail: true }, staff)).rejects.toThrow('al gemaild');
        expect(mail.sendMail).toHaveBeenCalledTimes(1);
      });
    });

    describe('editing and ending', () => {
      it('should end a note now and keep it', async () => {
        prisma.userNote.findUnique.mockResolvedValue(noteRow);
        const before = Date.now();
        await service.updateNote(5, 7, STAFF, { end: true }, staff);

        const { data } = prisma.userNote.update.mock.calls[0][0];
        expect(data.expiresAt.getTime()).toBeGreaterThanOrEqual(before);
        expect(prisma.userNote.delete).not.toHaveBeenCalled();
      });

      it("should need users.notes.delete_others for someone else's note", async () => {
        prisma.userNote.findUnique.mockResolvedValue({ ...noteRow, authorId: 99 });

        await expect(service.updateNote(5, 7, STAFF, { content: 'x' }, staff)).rejects.toThrow('eigen notities');
        await expect(service.updateNote(5, 7, STAFF, { content: 'x' }, new Set(['users.notes.delete_others']))).resolves.toBeDefined();
      });

      it('should not touch a note through another user', async () => {
        prisma.userNote.findUnique.mockResolvedValue(noteRow);
        await expect(service.deleteNote(6, 7, STAFF, staff)).rejects.toThrow('Note not found');
      });
    });
  });
});
