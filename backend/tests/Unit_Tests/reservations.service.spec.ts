import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReservationsService } from '../../src/modules/reservations/reservations.service.js';
import { PrismaService } from '../../src/modules/prisma/prisma.service.js';
import { ReservationStatus } from '../../src/dtos/reservations/reservation.dto.js';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prisma: any;

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

    const module = await Test.createTestingModule({
      providers: [ReservationsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(ReservationsService);
    prisma = module.get(PrismaService);
  });

  describe('Reservation Creation', () => {
    it('should validate time constraints', async () => {
      await expect(service.create({ ...baseDto, startTime: getIsoDate(-1) } as any)).rejects.toThrow(BadRequestException);
      await expect(service.create({ ...baseDto, startTime: getIsoDate(5) } as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw if hardware is not configured in settings', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue(null);

      await expect(service.create(baseDto as any)).rejects.toThrow("Hardware type 'pc' is not configured in settings.");
    });

    it('should throw if capacity configuration is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: 'invalid_string' });

      await expect(service.create(baseDto as any)).rejects.toThrow("Configuration error: capacity for 'pc' is not a valid number.");
    });

    it('should throw on conflicts for both create and adminCreate', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: '5' });
      prisma.reservation.count.mockResolvedValue(5);

      await expect(service.create(baseDto as any)).rejects.toThrow('already reserved');

      prisma.reservation.findFirst.mockResolvedValue({ id: 1 });
      await expect(service.adminCreate(baseDto as any)).rejects.toThrow('already reserved');
    });

    it('should include PRESENT status in conflict check for create', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: '1' });
      prisma.reservation.count.mockResolvedValue(1);

      await expect(service.create(baseDto as any)).rejects.toThrow('already reserved');

      expect(prisma.reservation.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [ReservationStatus.RESERVED, ReservationStatus.PRESENT] },
          }),
        }),
      );
    });

    it('should include PRESENT status in conflict check for adminCreate', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.reservation.findFirst.mockResolvedValue({ id: 1 });

      await expect(service.adminCreate(baseDto as any)).rejects.toThrow('already reserved');

      expect(prisma.reservation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [ReservationStatus.RESERVED, ReservationStatus.PRESENT] },
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
      await expect(service.update(1, {} as any)).rejects.toThrow(NotFoundException);
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
            status: { in: [ReservationStatus.RESERVED, ReservationStatus.PRESENT] },
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
      await expect(service.updateStatus(1, { status: ReservationStatus.PRESENT })).rejects.toThrow(NotFoundException);
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

    it('should throw if user has 3 or more no-shows', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: '5' });

      // 1e count: conflictingReservationsCount -> 0
      // 2e count: noShowCount -> 3
      prisma.reservation.count.mockResolvedValueOnce(0).mockResolvedValueOnce(3);

      await expect(service.create(baseDto as any)).rejects.toThrow('You already have three no-shows. You can no longer make new reservations.');
    });

    it('should throw if user has an overlapping reservation', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: '5' });

      // counts (conflict & no-show) op 0 zetten
      prisma.reservation.count.mockResolvedValue(0);

      // 1e findFirst: existingReservation -> retouneert een conflict
      prisma.reservation.findFirst.mockResolvedValueOnce({ id: 99 });

      await expect(service.create(baseDto as any)).rejects.toThrow('You already have a reservation that overlaps with this time slot');
    });

    it('should throw if user does not respect the 30-minute buffer', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: '5' });
      prisma.reservation.count.mockResolvedValue(0);

      // 1e findFirst: existingReservation (directe overlap) -> null
      // 2e findFirst: bufferConflict -> retouneert een conflict
      prisma.reservation.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 99 });

      await expect(service.create(baseDto as any)).rejects.toThrow('You must have at least 30 minutes between reservations');
    });

    it('should throw if user exceeds 2 reservations per day', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.setting.findFirst.mockResolvedValue({ value: '5' });
      prisma.reservation.findFirst.mockResolvedValue(null);

      // 1e count: conflictingReservationsCount -> 0
      // 2e count: noShowCount -> 0
      // 3e count: dailyReservationsCount -> 2 (limiet bereikt)
      prisma.reservation.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(2);

      await expect(service.create(baseDto as any)).rejects.toThrow('You can only make two reservations per day');
    });
  });
});
