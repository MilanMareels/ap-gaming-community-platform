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
      providers: [
        ReservationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ReservationsService);
    prisma = module.get(PrismaService);
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

    it('should throw on conflicts for both create and adminCreate', async () => {
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
  });
});
