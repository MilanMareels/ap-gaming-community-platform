import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReservationsService } from '../../src/modules/reservations/reservations.service.js';
import { PrismaService } from '../../src/modules/prisma/prisma.service.js';
import { CreateReservationDto, ReservationStatus } from '../../src/dtos/reservations/reservation.dto.js';
import { errorMessages } from '../../src/errors/errorMessages.js';
import { MailService } from '../../src/modules/mail/mail.service.js';
import { InventoryAdjustmentsService } from '../../src/modules/inventory-adjustments/inventory-adjustments.service.js';
import { wallClockNow } from '../../src/common/wall-clock.js';
import { ReservationRulesService } from '../../src/modules/reservations/reservation-rules.service.js';
import { PeopleService } from '../../src/modules/people/people.service.js';

const getIsoDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

/** A session in hub wall-clock time (stored as UTC), `dayOffset` days from today. */
const wallClockSlot = (dayOffset: number, hour = 14, minutes = 60) => {
  const now = wallClockNow();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, hour));
  return { startTime: start.toISOString(), endTime: new Date(start.getTime() + minutes * 60_000).toISOString() };
};

const weekdayIn = (dayOffset: number) => {
  const now = wallClockNow();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset)).getUTCDay();
};

const openOn = (...weekdays: number[]) => weekdays.map((dayOfWeek) => ({ dayOfWeek }));

const mockUser = { id: 1, email: 'test@student.ap.be', sNumber: 's123456', name: null };

const baseDto: CreateReservationDto = {
  inventory: 'pc',
  controllers: 1,
  startTime: getIsoDate(1),
  endTime: getIsoDate(1),
};

const baseAdminDto = {
  email: mockUser.email,
  sNumber: mockUser.sNumber,
  inventory: 'pc',
  controllers: 1,
  startTime: getIsoDate(1),
  endTime: getIsoDate(1),
};

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prisma: any;
  let mailService: any;

  beforeEach(async () => {
    baseDto.inventory = 'pc';
    baseDto.controllers = 1;
    Object.assign(baseDto, wallClockSlot(1));

    baseAdminDto.email = mockUser.email;
    baseAdminDto.sNumber = mockUser.sNumber;
    baseAdminDto.inventory = 'pc';
    baseAdminDto.controllers = 1;
    baseAdminDto.startTime = getIsoDate(1);
    baseAdminDto.endTime = getIsoDate(1);

    const mockPrisma = {
      user: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      microsoftSSOUser: { findFirst: jest.fn<() => Promise<{ id: number }>>().mockResolvedValue({ id: 1 }) },
      reservation: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      setting: {
        findFirst: jest.fn(),
        findMany: jest.fn<() => Promise<{ key: string; value: string }[]>>().mockResolvedValue([]),
      },
      timeTableEntry: {
        findMany: jest.fn<() => Promise<{ dayOfWeek: number }[]>>().mockResolvedValue(openOn(0, 1, 2, 3, 4, 5, 6)),
      },
    };

    const mockMailService = {
      sendMail: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      sendMailWithAttachments: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      generateQRCode: jest.fn<() => Promise<Buffer>>().mockResolvedValue(Buffer.from('fake-qr-code')),
    };

    const mockInventoryAdjustmentsService = {
      getEffectiveAdjustment: jest.fn<() => Promise<number>>().mockResolvedValue(0),
    };

    const module = await Test.createTestingModule({
      providers: [
        ReservationsService,
        ReservationRulesService,
        PeopleService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
        { provide: InventoryAdjustmentsService, useValue: mockInventoryAdjustmentsService },
      ],
    }).compile();

    service = module.get(ReservationsService);
    prisma = module.get(PrismaService);
    mailService = module.get(MailService);
  });

  describe('Reservation Creation', () => {
    it('should create a reservation successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: '5' });
      prisma.reservation.count.mockResolvedValue(0);
      prisma.reservation.findFirst.mockResolvedValue(null);

      const mockCreatedReservation = {
        id: 1,
        userId: mockUser.id,
        inventory: baseDto.inventory,
        controllers: baseDto.controllers,
        email: mockUser.email,
        startTime: new Date(baseDto.startTime),
        endTime: new Date(baseDto.endTime),
        status: ReservationStatus.RESERVED,
        user: mockUser,
      };

      prisma.reservation.create.mockResolvedValue(mockCreatedReservation);

      const res = await service.createForUser(mockUser.id, baseDto);

      expect(res).toEqual(mockCreatedReservation);
    });

    it('should refuse a user without a linked Microsoft account', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.microsoftSSOUser.findFirst.mockResolvedValue(null);

      await expect(service.createForUser(mockUser.id, baseDto)).rejects.toThrow(ForbiddenException);

      expect(prisma.microsoftSSOUser.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: mockUser.id } }));
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });

    it('should still let staff create a reservation for someone without a Microsoft account', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.microsoftSSOUser.findFirst.mockResolvedValue(null);
      prisma.setting.findFirst.mockResolvedValue({ value: '5' });
      prisma.reservation.count.mockResolvedValue(0);
      prisma.reservation.findFirst.mockResolvedValue(null);
      prisma.reservation.create.mockResolvedValue({ id: 1, cuid: 'cuid', user: mockUser });

      await service.adminCreate(baseAdminDto);

      expect(prisma.reservation.create).toHaveBeenCalled();
      expect(prisma.microsoftSSOUser.findFirst).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the authenticated user no longer exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.createForUser(999, baseDto)).rejects.toThrow(BadRequestException);
    });

    it('should refuse a reservation in the past', async () => {
      Object.assign(baseDto, wallClockSlot(-1));
      await expect(service.createForUser(mockUser.id, baseDto)).rejects.toThrow(errorMessages.pastDate);
    });

    it('should refuse a reservation 5 days ahead', async () => {
      Object.assign(baseDto, wallClockSlot(5));
      await expect(service.createForUser(mockUser.id, baseDto)).rejects.toThrow(errorMessages.dayNotBookable);
    });

    it('should refuse a day after the first next open day', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      Object.assign(baseDto, wallClockSlot(2)); // every day is open, so only today and tomorrow are bookable
      await expect(service.createForUser(mockUser.id, baseDto)).rejects.toThrow(errorMessages.dayNotBookable);
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });

    it('should accept the first open day when the days in between are closed', async () => {
      prisma.timeTableEntry.findMany.mockResolvedValue(openOn(weekdayIn(2)));
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: '5' });
      prisma.reservation.count.mockResolvedValue(0);
      prisma.reservation.findFirst.mockResolvedValue(null);
      prisma.reservation.create.mockResolvedValue({ id: 1, cuid: 'cuid', user: mockUser });

      Object.assign(baseDto, wallClockSlot(2));
      await service.createForUser(mockUser.id, baseDto);

      expect(prisma.reservation.create).toHaveBeenCalled();
    });

    it('should refuse a closed day', async () => {
      prisma.timeTableEntry.findMany.mockResolvedValue(openOn(weekdayIn(2)));
      Object.assign(baseDto, wallClockSlot(1));
      await expect(service.createForUser(mockUser.id, baseDto)).rejects.toThrow(errorMessages.dayNotBookable);
    });

    it.each([0, 45, 150])('should refuse a session of %i minutes', async (minutes) => {
      Object.assign(baseDto, wallClockSlot(1, 14, minutes));
      await expect(service.createForUser(mockUser.id, baseDto)).rejects.toThrow(errorMessages.invalidDuration);
    });

    describe('per-member limits', () => {
      const setRules = (rules: Record<string, string>) =>
        prisma.setting.findMany.mockResolvedValue(Object.entries(rules).map(([key, value]) => ({ key, value })));

      beforeEach(() => {
        prisma.user.findUnique.mockResolvedValue(mockUser);
        prisma.setting.findFirst.mockResolvedValue({ value: '5' });
        prisma.reservation.count.mockResolvedValue(0);
        prisma.reservation.findFirst.mockResolvedValue(null);
        prisma.reservation.create.mockResolvedValue({ id: 1, cuid: 'cuid', user: mockUser });
      });

      it('refuses a second reservation on the same day by default', async () => {
        prisma.reservation.count
          .mockResolvedValueOnce(0) // capacity
          .mockResolvedValueOnce(0) // no-shows
          .mockResolvedValueOnce(1); // already booked today

        await expect(service.createForUser(mockUser.id, baseDto)).rejects.toThrow(errorMessages.maxPerDay(1));
        expect(prisma.reservation.create).not.toHaveBeenCalled();
      });

      it('counts the reservations of the wall-clock day the session falls on', async () => {
        await service.createForUser(mockUser.id, baseDto);

        const day = baseDto.startTime.slice(0, 10);
        expect(prisma.reservation.count).toHaveBeenLastCalledWith({
          where: expect.objectContaining({
            userId: mockUser.id,
            startTime: { gte: new Date(`${day}T00:00:00.000Z`), lt: new Date(new Date(`${day}T00:00:00.000Z`).getTime() + 86_400_000) },
          }),
        });
      });

      it('allows several reservations a day when the limit is raised', async () => {
        setRules({ 'reservations.maxPerDay': '3' });
        prisma.reservation.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(2);

        await service.createForUser(mockUser.id, baseDto);

        expect(prisma.reservation.create).toHaveBeenCalled();
      });

      it('skips the daily limit when it is set to 0', async () => {
        setRules({ 'reservations.maxPerDay': '0', 'reservations.minGapMinutes': '0' });

        await service.createForUser(mockUser.id, baseDto);

        expect(prisma.reservation.count).toHaveBeenCalledTimes(2); // capacity and no-shows only
        expect(prisma.reservation.findFirst).toHaveBeenCalledTimes(1); // overlap only
        expect(prisma.reservation.create).toHaveBeenCalled();
      });

      it('refuses a reservation too close to another one', async () => {
        setRules({ 'reservations.minGapMinutes': '45' });
        prisma.reservation.findFirst
          .mockResolvedValueOnce(null) // no overlap
          .mockResolvedValueOnce({ id: 9 }); // but within the gap

        await expect(service.createForUser(mockUser.id, baseDto)).rejects.toThrow(errorMessages.minGap(45));
      });

      it('looks for any reservation within the gap, including short ones fully inside it', async () => {
        await service.createForUser(mockUser.id, baseDto);

        const start = new Date(baseDto.startTime).getTime();
        const end = new Date(baseDto.endTime).getTime();
        const gap = 90 * 60_000;
        expect(prisma.reservation.findFirst).toHaveBeenNthCalledWith(2, {
          where: expect.objectContaining({
            startTime: { lt: new Date(end + gap) },
            endTime: { gt: new Date(start - gap) },
          }),
        });
      });
    });

    describe('booking for a person as staff', () => {
      const created = { id: 1, cuid: 'cuid', user: mockUser };

      beforeEach(() => {
        prisma.setting.findFirst.mockResolvedValue({ value: '5' });
        prisma.reservation.count.mockResolvedValue(0);
        prisma.reservation.create.mockResolvedValue(created);
      });

      const bookedFor = () => prisma.reservation.create.mock.calls[0][0].data;

      it('books for the user picked in the search', async () => {
        prisma.user.findUnique.mockResolvedValue({ ...mockUser, id: 42, email: 'picked@student.ap.be' });

        await service.adminCreate({ ...baseAdminDto, email: undefined, sNumber: undefined, userId: 42 });

        expect(bookedFor()).toEqual(expect.objectContaining({ userId: 42, email: 'picked@student.ap.be' }));
        expect(prisma.user.create).not.toHaveBeenCalled();
      });

      it('refuses a picked user that no longer exists', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        await expect(service.adminCreate({ ...baseAdminDto, userId: 404 })).rejects.toThrow(NotFoundException);
      });

      it('matches the email whatever its casing', async () => {
        prisma.user.findFirst.mockResolvedValueOnce(mockUser);

        await service.adminCreate({ ...baseAdminDto, email: '  Test@Student.AP.be ' });

        expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { email: { equals: 'test@student.ap.be', mode: 'insensitive' } } });
        expect(bookedFor()).toEqual(expect.objectContaining({ userId: mockUser.id, email: mockUser.email }));
        expect(prisma.user.create).not.toHaveBeenCalled();
      });

      it('falls back to the student number, also when it is only in a short email', async () => {
        const student = { id: 5, email: 's654321@student.ap.be', sNumber: 's654321', name: 'Robin' };
        prisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(student);

        await service.adminCreate({ ...baseAdminDto, email: 'S654321@ap.be', sNumber: undefined });

        expect(prisma.user.findFirst).toHaveBeenLastCalledWith(
          expect.objectContaining({
            where: {
              OR: [
                { sNumber: { equals: 's654321', mode: 'insensitive' } },
                { email: { equals: 's654321@student.ap.be', mode: 'insensitive' } },
                { email: { equals: 's654321@ap.be', mode: 'insensitive' } },
              ],
            },
          }),
        );
        expect(bookedFor()).toEqual(expect.objectContaining({ userId: 5, email: 's654321@student.ap.be' }));
        expect(prisma.user.create).not.toHaveBeenCalled();
      });

      it('creates a named person when nobody matches', async () => {
        prisma.user.findFirst.mockResolvedValue(null);
        prisma.user.create.mockResolvedValue({ id: 9, email: 'new.person@example.com', sNumber: 's111111', name: 'New Person' });

        await service.adminCreate({ ...baseAdminDto, email: 'New.Person@example.com', name: ' New Person ', sNumber: 'S111111' });

        expect(prisma.user.create).toHaveBeenCalledWith({ data: { email: 'new.person@example.com', name: 'New Person', sNumber: 's111111' } });
        expect(bookedFor()).toEqual(expect.objectContaining({ userId: 9 }));
      });

      it('asks for an email when a new person has none', async () => {
        prisma.user.findFirst.mockResolvedValue(null);
        await expect(service.adminCreate({ ...baseAdminDto, email: undefined, sNumber: undefined, name: 'Nobody' })).rejects.toThrow(
          BadRequestException,
        );
      });

      it('fills in a missing name and student number but keeps existing ones', async () => {
        prisma.user.findFirst.mockResolvedValueOnce({ ...mockUser, name: null, sNumber: 'N/A' });
        prisma.user.update.mockResolvedValue(mockUser);

        await service.adminCreate({ ...baseAdminDto, name: 'Robin', sNumber: 's123456' });
        expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: mockUser.id }, data: { name: 'Robin', sNumber: 's123456' } });

        prisma.user.update.mockClear();
        prisma.user.findFirst.mockResolvedValueOnce({ ...mockUser, name: 'Robin Claes' });
        await service.adminCreate({ ...baseAdminDto, name: 'Someone else' });
        expect(prisma.user.update).not.toHaveBeenCalled();
      });

      it('moves a reservation to another picked person on edit', async () => {
        prisma.reservation.findUnique.mockResolvedValue({ id: 3, userId: mockUser.id, email: mockUser.email, user: mockUser });
        prisma.user.findUnique.mockResolvedValue({ ...mockUser, id: 42, email: 'other@student.ap.be' });
        prisma.reservation.update.mockResolvedValue({});

        await service.update(3, { userId: 42 });

        expect(prisma.reservation.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ userId: 42, email: 'other@student.ap.be' }) }),
        );
      });

      it('keeps the person when an edit only changes the email casing', async () => {
        prisma.reservation.findUnique.mockResolvedValue({ id: 3, userId: mockUser.id, email: mockUser.email, user: mockUser });
        prisma.reservation.update.mockResolvedValue({});

        await service.update(3, { email: mockUser.email.toUpperCase(), inventory: 'ps5' });

        expect(prisma.user.findFirst).not.toHaveBeenCalled();
        expect(prisma.reservation.update).toHaveBeenCalledWith(expect.objectContaining({ data: { inventory: 'ps5' } }));
      });
    });

    describe('verifyByCuid', () => {
      it('should mark a RESERVED reservation as PRESENT during verification', async () => {
        const reservation = {
          id: 12,
          cuid: 'cm9x8k2df0000a1b2c3d4e5f6',
          email: 'student@student.ap.be',
          inventory: 'pc',
          controllers: 2,
          startTime: new Date('2026-03-20T10:00:00.000Z'),
          endTime: new Date('2026-03-20T12:00:00.000Z'),
          status: ReservationStatus.RESERVED,
          user: { sNumber: 's123456' },
        };

        const updatedReservation = {
          ...reservation,
          status: ReservationStatus.PRESENT,
        };

        prisma.reservation.findFirst.mockResolvedValue(reservation);
        prisma.reservation.update.mockResolvedValue(updatedReservation);

        const result = await service.verifyByCuid(reservation.cuid);

        expect(prisma.reservation.findFirst).toHaveBeenCalledWith({
          where: { cuid: reservation.cuid },
          include: {
            user: {
              select: {
                sNumber: true,
              },
            },
          },
        });

        expect(prisma.reservation.update).toHaveBeenCalledWith({
          where: { id: reservation.id },
          data: { status: ReservationStatus.PRESENT },
          include: {
            user: {
              select: {
                sNumber: true,
              },
            },
          },
        });

        expect(result).toEqual({
          cuid: updatedReservation.cuid,
          email: updatedReservation.email,
          sNumber: updatedReservation.user.sNumber,
          inventory: updatedReservation.inventory,
          controllers: updatedReservation.controllers,
          startTime: updatedReservation.startTime,
          endTime: updatedReservation.endTime,
          status: ReservationStatus.PRESENT,
        });
      });

      it('should not update when reservation is already PRESENT', async () => {
        prisma.reservation.findFirst.mockResolvedValue({
          id: 99,
          cuid: 'present-cuid',
          email: 'student@student.ap.be',
          inventory: 'ps5',
          controllers: 1,
          startTime: new Date('2026-03-20T10:00:00.000Z'),
          endTime: new Date('2026-03-20T11:00:00.000Z'),
          status: ReservationStatus.PRESENT,
          user: { sNumber: 's123456' },
        });

        const result = await service.verifyByCuid('present-cuid');

        expect(prisma.reservation.update).not.toHaveBeenCalled();
        expect(result.status).toBe(ReservationStatus.PRESENT);
      });

      it('should throw NotFoundException when reservation does not exist', async () => {
        prisma.reservation.findFirst.mockResolvedValue(null);

        await expect(service.verifyByCuid('missing-cuid')).rejects.toThrow(NotFoundException);
      });

      it('should throw NotFoundException for cancelled reservations', async () => {
        prisma.reservation.findFirst.mockResolvedValue({
          cuid: 'cancelled-cuid',
          status: ReservationStatus.CANCELLED,
          user: { sNumber: 's1' },
        });

        await expect(service.verifyByCuid('cancelled-cuid')).rejects.toThrow(NotFoundException);
      });

      it('should throw NotFoundException for no-show reservations', async () => {
        prisma.reservation.findFirst.mockResolvedValue({
          cuid: 'noshow-cuid',
          status: ReservationStatus.NO_SHOW,
          user: { sNumber: 's1' },
        });

        await expect(service.verifyByCuid('noshow-cuid')).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Email Confirmation', () => {
    const mockCuid = 'clx1234567890abcdefghij';
    const mockReservation = {
      id: 123,
      cuid: mockCuid,
      userId: 1,
      email: mockUser.email,
      inventory: baseDto.inventory,
      controllers: baseDto.controllers,
      startTime: new Date(baseDto.startTime),
      endTime: new Date(baseDto.endTime),
      status: ReservationStatus.RESERVED,
      user: mockUser,
    };

    let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: '5' });
      prisma.reservation.count.mockResolvedValue(0);
      prisma.reservation.findFirst.mockResolvedValue(null);
      prisma.reservation.create.mockResolvedValue(mockReservation);
    });

    afterEach(() => {
      consoleErrorSpy?.mockRestore();
    });

    it('should send confirmation email after creating reservation', async () => {
      await service.createForUser(mockUser.id, baseDto);

      expect(mailService.generateQRCode).toHaveBeenCalledWith(mockCuid);
      expect(mailService.sendMailWithAttachments).toHaveBeenCalledWith(
        mockUser.email,
        'Reservatie Bevestiging - AP Gaming Hub',
        'reservation/confirmation',
        expect.objectContaining({
          sNumber: mockUser.sNumber,
          reservationId: mockCuid,
          email: mockUser.email,
          controllers: baseDto.controllers,
        }),
        expect.arrayContaining([
          expect.objectContaining({
            filename: 'qrcode.png',
            cid: 'qrcode',
          }),
        ]),
      );
    });

    it('should include formatted Dutch dates in email', async () => {
      await service.createForUser(mockUser.id, baseDto);

      expect(mailService.sendMailWithAttachments).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          startTime: expect.any(String),
          endTime: expect.any(String),
        }),
        expect.any(Array),
      );

      const callArgs = mailService.sendMailWithAttachments.mock.calls[0];
      const emailData = callArgs[3];

      // Verify dates are formatted (contain Dutch text)
      expect(typeof emailData.startTime).toBe('string');
      expect(typeof emailData.endTime).toBe('string');
    });

    it('should format email times in UTC (not server local timezone)', async () => {
      const dateStr = getIsoDate(1).split('T')[0];

      const fixedStart = new Date(`${dateStr}T13:00:00.000Z`);
      const fixedEnd = new Date(`${dateStr}T14:00:00.000Z`);

      const fixedReservation = {
        ...mockReservation,
        startTime: fixedStart,
        endTime: fixedEnd,
      };
      prisma.reservation.create.mockResolvedValue(fixedReservation);

      await service.createForUser(mockUser.id, {
        ...baseDto,
        startTime: fixedStart.toISOString(),
        endTime: fixedEnd.toISOString(),
      });

      const callArgs = mailService.sendMailWithAttachments.mock.calls[0];
      const emailData = callArgs[3];

      // Times should reflect UTC (13:00 and 14:00), not CET (14:00 and 15:00)
      expect(emailData.startTime).toContain('13:00');
      expect(emailData.endTime).toContain('14:00');
    });

    it('should capitalize inventory names correctly in email', async () => {
      const testCases = [
        { inventory: 'pc', expected: 'PC' },
        { inventory: 'ps5', expected: 'PlayStation 5' },
        { inventory: 'switch', expected: 'Nintendo Switch' },
      ];

      for (const testCase of testCases) {
        prisma.reservation.create.mockResolvedValue({
          ...mockReservation,
          cuid: mockCuid,
          inventory: testCase.inventory,
        });

        await service.createForUser(mockUser.id, {
          ...baseDto,
          inventory: testCase.inventory,
        });

        const lastCall = mailService.sendMailWithAttachments.mock.calls[mailService.sendMailWithAttachments.mock.calls.length - 1];
        expect(lastCall[3].inventory).toBe(testCase.expected);
      }
    });

    it('should send confirmation email for admin-created reservations', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      await service.adminCreate(baseAdminDto as any);

      expect(mailService.generateQRCode).toHaveBeenCalledWith(mockCuid);
      expect(mailService.sendMailWithAttachments).toHaveBeenCalled();
    });

    it('should handle admin reservations for a new person without sNumber', async () => {
      const dtoWithoutSNumber = { ...baseAdminDto, email: 'guest@example.com' };
      delete (dtoWithoutSNumber as any).sNumber;
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 7, email: 'guest@example.com', sNumber: 'N/A', name: null });

      await service.adminCreate(dtoWithoutSNumber as any);

      expect(mailService.sendMailWithAttachments).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          sNumber: 'N/A',
        }),
        expect.any(Array),
      );
    });

    it('should not fail reservation creation if email sending fails', async () => {
      mailService.sendMailWithAttachments.mockRejectedValue(new Error('SMTP error'));

      const result = await service.createForUser(mockUser.id, baseDto);

      expect(result).toEqual(mockReservation);
      expect(prisma.reservation.create).toHaveBeenCalled();
    });

    it('should log error when email fails but continue', async () => {
      mailService.sendMailWithAttachments.mockRejectedValue(new Error('Email service down'));

      await service.createForUser(mockUser.id, baseDto);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send confirmation email:', expect.any(Error));
    });

    it('should generate QR code with reservation CUID', async () => {
      await service.createForUser(mockUser.id, baseDto);

      expect(mailService.generateQRCode).toHaveBeenCalledWith(expect.stringMatching(/^c[a-z0-9]+$/));
    });

    it('should include QR code as inline attachment with correct CID', async () => {
      const qrBuffer = Buffer.from('test-qr-data');
      mailService.generateQRCode.mockResolvedValue(qrBuffer);

      await service.createForUser(mockUser.id, baseDto);

      expect(mailService.sendMailWithAttachments).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.arrayContaining([
          expect.objectContaining({
            filename: 'qrcode.png',
            content: qrBuffer,
            cid: 'qrcode',
          }),
        ]),
      );
    });

    it('should send email to the authenticated user', async () => {
      const customUser = { ...mockUser, email: 'specific@student.ap.be' };
      prisma.user.findUnique.mockResolvedValue(customUser);

      await service.createForUser(customUser.id, baseDto);

      expect(mailService.sendMailWithAttachments).toHaveBeenCalledWith(
        customUser.email,
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.any(Array),
      );
    });

    it('should use correct email template path', async () => {
      await service.createForUser(mockUser.id, baseDto);

      expect(mailService.sendMailWithAttachments).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'reservation/confirmation',
        expect.any(Object),
        expect.any(Array),
      );
    });

    it('should include all required data in email template', async () => {
      await service.createForUser(mockUser.id, baseDto);

      const callArgs = mailService.sendMailWithAttachments.mock.calls[0];
      const emailData = callArgs[3];

      expect(emailData).toHaveProperty('sNumber');
      expect(emailData).toHaveProperty('reservationId');
      expect(emailData).toHaveProperty('inventory');
      expect(emailData).toHaveProperty('controllers');
      expect(emailData).toHaveProperty('startTime');
      expect(emailData).toHaveProperty('endTime');
      expect(emailData).toHaveProperty('email');
    });
  });

  describe('No-show emails', () => {
    const reservationRow = (status: ReservationStatus) => ({
      id: 7,
      cuid: 'res-cuid',
      userId: mockUser.id,
      email: mockUser.email,
      inventory: 'pc',
      controllers: 1,
      startTime: new Date('2026-10-12T14:00:00.000Z'),
      endTime: new Date('2026-10-12T16:00:00.000Z'),
      status,
    });

    const markNoShow = async (noShowCount: number) => {
      prisma.reservation.findUnique.mockResolvedValue(reservationRow(ReservationStatus.RESERVED));
      prisma.reservation.update.mockResolvedValue({ ...reservationRow(ReservationStatus.NO_SHOW), user: mockUser });
      prisma.reservation.count.mockResolvedValue(noShowCount);
      await service.updateStatus(7, { status: ReservationStatus.NO_SHOW });
      return mailService.sendMail.mock.calls[0];
    };

    it('should send a friendly reminder on the first no-show', async () => {
      const [to, subject, template, data] = await markNoShow(1);

      expect(to).toBe(mockUser.email);
      expect(subject).toBe('We hebben je gemist - AP Gaming Hub');
      expect(template).toBe('reservation/no-show');
      expect(data).toMatchObject({ noShowCount: 1, noShowLimit: 3, remaining: 2, isFirst: true, isBlocked: false, name: mockUser.sNumber });
    });

    it('should warn about an upcoming block on the second no-show', async () => {
      const [, subject, , data] = await markNoShow(2);

      expect(subject).toBe('Waarschuwing: herhaalde no-show - AP Gaming Hub');
      expect(data).toMatchObject({ noShowCount: 2, remaining: 1, isFirst: false, isBlocked: false });
    });

    it('should tell the user they are blocked on the third no-show', async () => {
      const [, subject, , data] = await markNoShow(3);

      expect(subject).toBe('Je kan niet meer reserveren - AP Gaming Hub');
      expect(data).toMatchObject({ noShowCount: 3, remaining: 0, isFirst: false, isBlocked: true });
    });

    it('should count no-shows for the reservation owner', async () => {
      await markNoShow(1);

      expect(prisma.reservation.count).toHaveBeenCalledWith({
        where: { userId: mockUser.id, status: ReservationStatus.NO_SHOW },
      });
    });

    it('should not send an email when the reservation already was a no-show', async () => {
      prisma.reservation.findUnique.mockResolvedValue(reservationRow(ReservationStatus.NO_SHOW));
      prisma.reservation.update.mockResolvedValue({ ...reservationRow(ReservationStatus.NO_SHOW), user: mockUser });

      await service.updateStatus(7, { status: ReservationStatus.NO_SHOW });

      expect(mailService.sendMail).not.toHaveBeenCalled();
    });

    it('should not send a no-show email for other status changes', async () => {
      prisma.reservation.findUnique.mockResolvedValue(reservationRow(ReservationStatus.RESERVED));
      prisma.reservation.update.mockResolvedValue({ ...reservationRow(ReservationStatus.PRESENT), user: mockUser });

      await service.updateStatus(7, { status: ReservationStatus.PRESENT });

      expect(mailService.sendMail).not.toHaveBeenCalled();
    });

    it('should still update the status when sending the email fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mailService.sendMail.mockRejectedValue(new Error('SMTP down'));
      prisma.reservation.findUnique.mockResolvedValue(reservationRow(ReservationStatus.RESERVED));
      prisma.reservation.update.mockResolvedValue({ ...reservationRow(ReservationStatus.NO_SHOW), user: mockUser });
      prisma.reservation.count.mockResolvedValue(1);

      const result = await service.updateStatus(7, { status: ReservationStatus.NO_SHOW });

      expect(result.status).toBe(ReservationStatus.NO_SHOW);
      consoleSpy.mockRestore();
    });
  });

  describe('Own reservations', () => {
    it('should return the user reservations with their no-show status', async () => {
      prisma.reservation.findMany.mockResolvedValue([
        { cuid: 'a', inventory: 'pc', controllers: 1, startTime: new Date(), endTime: new Date(), status: ReservationStatus.NO_SHOW },
        { cuid: 'b', inventory: 'ps5', controllers: 2, startTime: new Date(), endTime: new Date(), status: ReservationStatus.RESERVED },
      ]);

      const result = await service.getMine(mockUser.id);

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: mockUser.id } }));
      expect(result.reservations).toHaveLength(2);
      expect(result).toMatchObject({ noShowCount: 1, noShowLimit: 3, isBlocked: false });
    });

    it('should mark the user as blocked once the no-show limit is reached', async () => {
      prisma.reservation.findMany.mockResolvedValue(
        Array.from({ length: 3 }, (_, i) => ({
          cuid: `c${i}`,
          inventory: 'pc',
          controllers: 1,
          startTime: new Date(),
          endTime: new Date(),
          status: ReservationStatus.NO_SHOW,
        })),
      );

      const result = await service.getMine(mockUser.id);

      expect(result.isBlocked).toBe(true);
    });

    it('should cancel an upcoming reservation owned by the user', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        id: 7,
        userId: mockUser.id,
        status: ReservationStatus.RESERVED,
        startTime: new Date(getIsoDate(1)),
      });
      prisma.reservation.update.mockResolvedValue({
        id: 7,
        cuid: 'res-cuid',
        email: mockUser.email,
        inventory: 'pc',
        controllers: 1,
        startTime: new Date(getIsoDate(1)),
        endTime: new Date(getIsoDate(1)),
        status: ReservationStatus.CANCELLED,
        user: mockUser,
      });

      await service.cancelMine(mockUser.id, 'res-cuid');

      expect(prisma.reservation.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: ReservationStatus.CANCELLED } }));
      expect(mailService.sendMail).toHaveBeenCalledWith(mockUser.email, expect.any(String), 'reservation/cancellation', expect.any(Object));
    });

    it('should not let a user cancel a reservation of someone else', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        id: 7,
        userId: 999,
        status: ReservationStatus.RESERVED,
        startTime: new Date(getIsoDate(1)),
      });

      await expect(service.cancelMine(mockUser.id, 'res-cuid')).rejects.toThrow(NotFoundException);
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });

    it('should not cancel a reservation that has already started', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        id: 7,
        userId: mockUser.id,
        status: ReservationStatus.RESERVED,
        startTime: new Date(getIsoDate(-1)),
      });

      await expect(service.cancelMine(mockUser.id, 'res-cuid')).rejects.toThrow(BadRequestException);
      expect(prisma.reservation.update).not.toHaveBeenCalled();
    });
  });
  describe('Booking time', () => {
    beforeEach(() => {
      prisma.setting.findFirst.mockResolvedValue({ value: '5' });
      prisma.reservation.count.mockResolvedValue(0);
      prisma.reservation.findFirst.mockResolvedValue(null);
      prisma.reservation.create.mockResolvedValue({ id: 1, cuid: 'cuid', user: mockUser });
    });

    const createdWith = () => prisma.reservation.create.mock.calls[0][0].data;

    it('records when a member made their reservation, in wall-clock time', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const before = wallClockNow().getTime();

      await service.createForUser(mockUser.id, baseDto);

      const { createdAt, createdByStaff } = createdWith();
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
      expect(createdAt.getTime()).toBeLessThanOrEqual(wallClockNow().getTime() + 1000);
      expect(createdByStaff).toBeUndefined();
    });

    it('marks reservations staff enter for someone', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await service.adminCreate(baseAdminDto);

      expect(createdWith()).toEqual(expect.objectContaining({ createdAt: expect.any(Date), createdByStaff: true }));
    });
  });

  describe('Booking statistics', () => {
    const at = (iso: string) => new Date(`${iso}Z`);
    const row = (start: string, createdAt: string | null, createdByStaff = false) => ({
      userId: 1,
      email: mockUser.email,
      inventory: 'pc',
      controllers: 1,
      startTime: at(start),
      endTime: new Date(at(start).getTime() + 3_600_000),
      status: ReservationStatus.PRESENT,
      createdAt: createdAt ? at(createdAt) : null,
      createdByStaff,
      user: { name: null, sNumber: mockUser.sNumber },
    });

    it('works out when people book and how far ahead, leaving out staff entries and untracked ones', async () => {
      prisma.reservation.findMany.mockResolvedValue([
        // Monday 2026-11-16: booked 30 minutes ahead, same day
        row('2026-11-16T14:00:00', '2026-11-16T13:30:00'),
        // Tuesday: booked the evening before at 21:00, 17 hours ahead
        row('2026-11-17T14:00:00', '2026-11-16T21:00:00'),
        // Tuesday: booked the morning of, 4 hours ahead
        row('2026-11-17T15:00:00', '2026-11-17T11:00:00'),
        row('2026-11-18T14:00:00', '2026-11-18T14:00:00', true),
        row('2026-11-18T15:00:00', null),
      ]);

      const { bookingBehaviour } = await service.getStatistics();

      expect(bookingBehaviour.trackedReservations).toBe(3);
      expect(bookingBehaviour.staffReservations).toBe(1);
      expect(bookingBehaviour.avgLeadMinutes).toBe(Math.round((30 + 1020 + 240) / 3));
      expect(bookingBehaviour.medianLeadMinutes).toBe(240);
      expect(bookingBehaviour.sameDayPercent).toBe(66.7);
      expect(bookingBehaviour.bookingHoursHeatmap).toEqual(
        expect.arrayContaining([
          { day: 'Maandag', hour: 13, count: 1 },
          { day: 'Maandag', hour: 21, count: 1 },
          { day: 'Dinsdag', hour: 11, count: 1 },
        ]),
      );
      expect(bookingBehaviour.leadTimeDistribution).toEqual([
        { label: '< 1u', count: 1 },
        { label: '1-3u', count: 0 },
        { label: '3-6u', count: 1 },
        { label: '6-12u', count: 0 },
        { label: '12-24u', count: 1 },
        { label: '1-2 dagen', count: 0 },
        { label: '2+ dagen', count: 0 },
      ]);
    });

    it('gives a per-person average lead time, or none when it is unknown', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.reservation.findMany.mockResolvedValueOnce([row('2026-11-16T14:00:00', '2026-11-16T12:00:00'), row('2026-11-17T14:00:00', '2026-11-17T13:00:00')]);
      expect((await service.getUserStatistics(1)).avgLeadMinutes).toBe(90);

      prisma.reservation.findMany.mockResolvedValueOnce([row('2026-11-16T14:00:00', null)]);
      expect((await service.getUserStatistics(1)).avgLeadMinutes).toBeNull();
    });
  });
});
