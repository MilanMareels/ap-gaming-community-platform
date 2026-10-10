import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReservationsService } from '../../src/modules/reservations/reservations.service.js';
import { PrismaService } from '../../src/modules/prisma/prisma.service.js';
import { CreateReservationDto, ReservationStatus } from '../../src/dtos/reservations/reservation.dto.js';
import { errorMessages } from '../../src/errors/errorMessages.js';
import { MailService } from '../../src/modules/mail/mail.service.js';
import { InventoryAdjustmentsService } from '../../src/modules/inventory-adjustments/inventory-adjustments.service.js';

const getIsoDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

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
    baseDto.startTime = getIsoDate(1);
    baseDto.endTime = getIsoDate(1);

    baseAdminDto.email = mockUser.email;
    baseAdminDto.sNumber = mockUser.sNumber;
    baseAdminDto.inventory = 'pc';
    baseAdminDto.controllers = 1;
    baseAdminDto.startTime = getIsoDate(1);
    baseAdminDto.endTime = getIsoDate(1);

    const mockPrisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
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
      },
    };

    const mockMailService = {
      sendMail: jest.fn().mockResolvedValue(undefined),
      sendMailWithAttachments: jest.fn().mockResolvedValue(undefined),
      generateQRCode: jest.fn().mockResolvedValue(Buffer.from('fake-qr-code')),
    };

    const mockInventoryAdjustmentsService = {
      getEffectiveAdjustment: jest.fn().mockResolvedValue(0),
    };

    const module = await Test.createTestingModule({
      providers: [
        ReservationsService,
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

    it('should throw BadRequestException when the authenticated user no longer exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.createForUser(999, baseDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw an BadRequestException when trying to create an reservation when is in the past', async () => {
      baseDto.startTime = getIsoDate(-1);
      await expect(service.createForUser(mockUser.id, baseDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw an BadRequestException when trying to create an reservation 3 days in the future', async () => {
      baseDto.startTime = getIsoDate(5);
      await expect(service.createForUser(mockUser.id, baseDto)).rejects.toThrow(BadRequestException);
    });

    it('should return corrct error message when trying to create an reservation when is in the past', async () => {
      baseDto.startTime = getIsoDate(-1);
      await expect(service.createForUser(mockUser.id, baseDto)).rejects.toThrow(errorMessages.pastDate);
    });

    it('should return corrct error message when trying to create an reservation 3 days in the future', async () => {
      baseDto.startTime = getIsoDate(5);
      await expect(service.createForUser(mockUser.id, baseDto)).rejects.toThrow(errorMessages.maxAdvanceDays);
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
      await service.adminCreate(baseAdminDto as any);

      expect(mailService.generateQRCode).toHaveBeenCalledWith(mockCuid);
      expect(mailService.sendMailWithAttachments).toHaveBeenCalled();
    });

    it('should handle admin reservations without sNumber', async () => {
      const dtoWithoutSNumber = { ...baseAdminDto };
      delete (dtoWithoutSNumber as any).sNumber;

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
});
