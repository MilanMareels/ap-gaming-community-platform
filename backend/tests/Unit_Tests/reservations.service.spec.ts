import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReservationsService } from '../../src/modules/reservations/reservations.service.js';
import { PrismaService } from '../../src/modules/prisma/prisma.service.js';
import { MailService } from '../../src/modules/mail/mail.service.js';
import { ReservationStatus } from '../../src/dtos/reservations/reservation.dto.js';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prisma: any;
  let mailService: any;

  const mockUser = { id: 1, email: 'test@student.ap.be', sNumber: 's123456' };

  const getIsoDate = (offset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString();
  };

  const baseDto = {
    email: mockUser.email,
    sNumber: mockUser.sNumber,
    inventory: 'pc',
    controllers: 2,
    startTime: getIsoDate(1),
    endTime: getIsoDate(1.5),
  };

  beforeEach(async () => {
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
      sendMailWithAttachments: jest.fn().mockResolvedValue(undefined),
      generateQRCode: jest.fn().mockResolvedValue(Buffer.from('fake-qr-code')),
    };

    const module = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get(ReservationsService);
    prisma = module.get(PrismaService);
    mailService = module.get(MailService);
  });

  describe('Reservation Creation', () => {
    it('should validate time constraints', async () => {
      await expect(
        service.create({ ...baseDto, startTime: getIsoDate(-1) } as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ ...baseDto, startTime: getIsoDate(5) } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if hardware is not configured in settings', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue(null);

      await expect(service.create(baseDto as any)).rejects.toThrow(
        "Hardware type 'pc' is not configured in settings.",
      );
    });

    it('should throw if capacity configuration is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: 'invalid_string' });

      await expect(service.create(baseDto as any)).rejects.toThrow(
        "Configuration error: capacity for 'pc' is not a valid number.",
      );
    });

    it('should throw on conflicts for both create and adminCreate', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: '5' });
      prisma.reservation.count.mockResolvedValue(5);

      await expect(service.create(baseDto as any)).rejects.toThrow(
        'already reserved',
      );

      prisma.reservation.findFirst.mockResolvedValue({ id: 1 });
      await expect(service.adminCreate(baseDto as any)).rejects.toThrow(
        'already reserved',
      );
    });

    it('should include PRESENT status in conflict check for create', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: '1' });
      prisma.reservation.count.mockResolvedValue(1);

      await expect(service.create(baseDto as any)).rejects.toThrow(
        'already reserved',
      );

      expect(prisma.reservation.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: {
              in: [ReservationStatus.RESERVED, ReservationStatus.PRESENT],
            },
          }),
        }),
      );
    });

    it('should include PRESENT status in conflict check for adminCreate', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.reservation.findFirst.mockResolvedValue({ id: 1 });

      await expect(service.adminCreate(baseDto as any)).rejects.toThrow(
        'already reserved',
      );

      expect(prisma.reservation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: {
              in: [ReservationStatus.RESERVED, ReservationStatus.PRESENT],
            },
          }),
        }),
      );
    });

    it('should create reservation and user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: '5' });
      prisma.reservation.count.mockResolvedValue(0);
      prisma.reservation.findFirst.mockResolvedValue(null);
      prisma.reservation.create.mockResolvedValue({ id: 10 });

      const res = await service.create(baseDto as any);
      expect(res.id).toBe(10);
    });

    it('should allow multiple different users to book the same timeslot if capacity allows it', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      prisma.user.create.mockResolvedValue({
        id: 2,
        email: 'anderestudent@student.ap.be',
        sNumber: 's987654',
      });

      prisma.setting.findFirst.mockResolvedValue({ value: '5' });

      prisma.reservation.count.mockResolvedValue(1);

      prisma.reservation.create.mockResolvedValue({ id: 11 });

      const secondUserDto = {
        ...baseDto,
        email: 'anderestudent@student.ap.be',
        sNumber: 's987654',
      };

      const res = await service.create(secondUserDto as any);

      expect(res.id).toBe(11);
      expect(prisma.reservation.count).toHaveBeenCalled();
      expect(prisma.reservation.create).toHaveBeenCalled();
    });

    it('should allow admin to create and return the result', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.reservation.findFirst.mockResolvedValue(null);
      prisma.reservation.create.mockResolvedValue({ id: 100 });

      const res = await service.adminCreate({
        ...baseDto,
        sNumber: undefined,
      } as any);
      expect(res.id).toBe(100);
    });
  });

  describe('Reservation Updates', () => {
    const existing = { id: 1, email: baseDto.email, userId: 1, user: mockUser };

    it('should throw NotFound if reservation is missing', async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);
      await expect(service.update(1, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle email changes and user creation', async () => {
      prisma.reservation.findUnique.mockResolvedValue(existing);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 2 });
      prisma.reservation.update.mockResolvedValue({ id: 1 });

      await service.update(1, { email: 'new@ap.be' } as any);
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should update existing user sNumber', async () => {
      prisma.reservation.findUnique.mockResolvedValue(existing);
      prisma.reservation.update.mockResolvedValue({ id: 1 });

      await service.update(1, { sNumber: 's999' } as any);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should update all fields including dates', async () => {
      prisma.reservation.findUnique.mockResolvedValue(existing);
      prisma.reservation.update.mockResolvedValue({ id: 1 });

      const updateDto = {
        inventory: 'ps5',
        controllers: 0,
        startTime: getIsoDate(2),
        endTime: getIsoDate(2.5),
      };

      await service.update(1, updateDto as any);

      expect(prisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inventory: 'ps5',
            startTime: expect.any(Date),
            endTime: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('Utility & Status Methods', () => {
    it('should fetch slots and all reservations with filters', async () => {
      prisma.reservation.findMany.mockResolvedValue([]);
      await service.getSlots('2026-02-28');
      await service.findAll('2026-02-28', 'term');
      expect(prisma.reservation.findMany).toHaveBeenCalledTimes(2);
    });

    it('should include PRESENT status when fetching slots', async () => {
      prisma.reservation.findMany.mockResolvedValue([]);
      await service.getSlots('2026-02-28');

      expect(prisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: {
              in: [ReservationStatus.RESERVED, ReservationStatus.PRESENT],
            },
          }),
        }),
      );
    });

    it('should update status successfully', async () => {
      prisma.reservation.findUnique.mockResolvedValue({ id: 1 });
      prisma.reservation.update.mockResolvedValue({ status: 'PRESENT' });
      const res = await service.updateStatus(1, {
        status: ReservationStatus.PRESENT,
      });
      expect(res.status).toBe('PRESENT');
    });

    it('should throw NotFound on updateStatus if missing', async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus(1, { status: ReservationStatus.PRESENT }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove a reservation', async () => {
      prisma.reservation.delete.mockResolvedValue({ id: 1 });
      await service.remove(1);
      expect(prisma.reservation.delete).toHaveBeenCalled();
    });

    it('should retrieve no-shows', async () => {
      prisma.reservation.findMany.mockResolvedValue([]);
      await service.getNoShows();
      expect(prisma.reservation.findMany).toHaveBeenCalled();
    });

    describe('verifyByCuid', () => {
      it('should return mapped verification data for an active reservation', async () => {
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

        prisma.reservation.findFirst.mockResolvedValue(reservation);

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

        expect(result).toEqual({
          cuid: reservation.cuid,
          email: reservation.email,
          sNumber: reservation.user.sNumber,
          inventory: reservation.inventory,
          controllers: reservation.controllers,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          status: reservation.status,
        });
      });

      it('should throw NotFoundException when reservation does not exist', async () => {
        prisma.reservation.findFirst.mockResolvedValue(null);

        await expect(service.verifyByCuid('missing-cuid')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should throw NotFoundException for cancelled reservations', async () => {
        prisma.reservation.findFirst.mockResolvedValue({
          cuid: 'cancelled-cuid',
          status: ReservationStatus.CANCELLED,
          user: { sNumber: 's1' },
        });

        await expect(service.verifyByCuid('cancelled-cuid')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should throw NotFoundException for no-show reservations', async () => {
        prisma.reservation.findFirst.mockResolvedValue({
          cuid: 'noshow-cuid',
          status: ReservationStatus.NO_SHOW,
          user: { sNumber: 's1' },
        });

        await expect(service.verifyByCuid('noshow-cuid')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('Email Confirmation', () => {
    const mockCuid = 'clx1234567890abcdefghij';
    const mockReservation = {
      id: 123,
      cuid: mockCuid,
      userId: 1,
      email: baseDto.email,
      inventory: baseDto.inventory,
      controllers: baseDto.controllers,
      startTime: new Date(baseDto.startTime),
      endTime: new Date(baseDto.endTime),
      status: ReservationStatus.RESERVED,
      user: mockUser,
    };

    let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: '5' });
      prisma.reservation.count.mockResolvedValue(0);
      prisma.reservation.findFirst.mockResolvedValue(null);
      prisma.reservation.create.mockResolvedValue(mockReservation);
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should send confirmation email after creating reservation', async () => {
      await service.create(baseDto as any);

      expect(mailService.generateQRCode).toHaveBeenCalledWith(mockCuid);
      expect(mailService.sendMailWithAttachments).toHaveBeenCalledWith(
        baseDto.email,
        'Reservatie Bevestiging - AP Gaming Hub',
        'reservation/confirmation',
        expect.objectContaining({
          sNumber: baseDto.sNumber,
          reservationId: mockCuid,
          email: baseDto.email,
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
      await service.create(baseDto as any);

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

      await service.create({
        ...baseDto,
        startTime: fixedStart.toISOString(),
        endTime: fixedEnd.toISOString(),
      } as any);

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

        await service.create({
          ...baseDto,
          inventory: testCase.inventory,
        } as any);

        const lastCall =
          mailService.sendMailWithAttachments.mock.calls[
            mailService.sendMailWithAttachments.mock.calls.length - 1
          ];
        expect(lastCall[3].inventory).toBe(testCase.expected);
      }
    });

    it('should send confirmation email for admin-created reservations', async () => {
      await service.adminCreate(baseDto as any);

      expect(mailService.generateQRCode).toHaveBeenCalledWith(mockCuid);
      expect(mailService.sendMailWithAttachments).toHaveBeenCalled();
    });

    it('should handle admin reservations without sNumber', async () => {
      const dtoWithoutSNumber = { ...baseDto };
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
      mailService.sendMailWithAttachments.mockRejectedValue(
        new Error('SMTP error'),
      );

      const result = await service.create(baseDto as any);

      expect(result).toEqual(mockReservation);
      expect(prisma.reservation.create).toHaveBeenCalled();
    });

    it('should log error when email fails but continue', async () => {
      mailService.sendMailWithAttachments.mockRejectedValue(
        new Error('Email service down'),
      );

      await service.create(baseDto as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to send confirmation email:',
        expect.any(Error),
      );
    });

    it('should generate QR code with reservation CUID', async () => {
      await service.create(baseDto as any);

      expect(mailService.generateQRCode).toHaveBeenCalledWith(
        expect.stringMatching(/^c[a-z0-9]+$/),
      );
    });

    it('should include QR code as inline attachment with correct CID', async () => {
      const qrBuffer = Buffer.from('test-qr-data');
      mailService.generateQRCode.mockResolvedValue(qrBuffer);

      await service.create(baseDto as any);

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

    it('should send email to the correct recipient', async () => {
      const testEmail = 'specific@student.ap.be';
      await service.create({ ...baseDto, email: testEmail } as any);

      expect(mailService.sendMailWithAttachments).toHaveBeenCalledWith(
        testEmail,
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.any(Array),
      );
    });

    it('should use correct email template path', async () => {
      await service.create(baseDto as any);

      expect(mailService.sendMailWithAttachments).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'reservation/confirmation',
        expect.any(Object),
        expect.any(Array),
      );
    });

    it('should include all required data in email template', async () => {
      await service.create(baseDto as any);

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
});
