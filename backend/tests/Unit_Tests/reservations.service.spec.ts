import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReservationsService } from '../../src/modules/reservations/reservations.service.js';
import { PrismaService } from '../../src/modules/prisma/prisma.service.js';
import { CreateReservationDto, ReservationStatus } from '../../src/dtos/reservations/reservation.dto.js';
import { errorMessages } from '../../src/errors/errorMessages.js';
import { MailService } from '../../src/modules/mail/mail.service.js';

const getIsoDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

const mockUser = { id: 1, email: 'test@student.ap.be', sNumber: 's123456' };

const baseDto: CreateReservationDto = {
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
    baseDto.email = mockUser.email;
    baseDto.sNumber = mockUser.sNumber;
    baseDto.inventory = 'pc';
    baseDto.controllers = 1;
    baseDto.startTime = getIsoDate(1);
    baseDto.endTime = getIsoDate(1);

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
    it('should create a reservation successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: '5' });
      prisma.reservation.count.mockResolvedValue(0);
      prisma.reservation.findFirst.mockResolvedValue(null);

      const mockCreatedReservation = {
        id: 1,
        userId: mockUser.id,
        inventory: baseDto.inventory,
        controllers: baseDto.controllers,
        email: baseDto.email,
        startTime: new Date(baseDto.startTime),
        endTime: new Date(baseDto.endTime),
        status: ReservationStatus.RESERVED,
        user: mockUser,
      };

      prisma.reservation.create.mockResolvedValue(mockCreatedReservation);

      const res = await service.create(baseDto);

      expect(res).toEqual(mockCreatedReservation);
    });

    it('should throw an BadRequestException when trying to create an reservation when is in the past', async () => {
      baseDto.startTime = getIsoDate(-1);
      await expect(service.create(baseDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw an BadRequestException when trying to create an reservation 3 days in the future', async () => {
      baseDto.startTime = getIsoDate(5);
      await expect(service.create(baseDto)).rejects.toThrow(BadRequestException);
    });

    it('should return corrct error message when trying to create an reservation when is in the past', async () => {
      baseDto.startTime = getIsoDate(-1);
      await expect(service.create(baseDto)).rejects.toThrow(errorMessages.pastDate);
    });

    it('should return corrct error message when trying to create an reservation 3 days in the future', async () => {
      baseDto.startTime = getIsoDate(5);
      await expect(service.create(baseDto)).rejects.toThrow(errorMessages.maxAdvanceDays);
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

        const lastCall = mailService.sendMailWithAttachments.mock.calls[mailService.sendMailWithAttachments.mock.calls.length - 1];
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
      mailService.sendMailWithAttachments.mockRejectedValue(new Error('SMTP error'));

      const result = await service.create(baseDto as any);

      expect(result).toEqual(mockReservation);
      expect(prisma.reservation.create).toHaveBeenCalled();
    });

    it('should log error when email fails but continue', async () => {
      mailService.sendMailWithAttachments.mockRejectedValue(new Error('Email service down'));

      await service.create(baseDto as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send confirmation email:', expect.any(Error));
    });

    it('should generate QR code with reservation CUID', async () => {
      await service.create(baseDto as any);

      expect(mailService.generateQRCode).toHaveBeenCalledWith(expect.stringMatching(/^c[a-z0-9]+$/));
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
