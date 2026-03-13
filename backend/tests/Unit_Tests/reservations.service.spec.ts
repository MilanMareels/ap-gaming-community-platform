import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReservationsService } from '../../src/modules/reservations/reservations.service.js';
import { PrismaService } from '../../src/modules/prisma/prisma.service.js';
import { CreateReservationDto, ReservationStatus } from '../../src/dtos/reservations/reservation.dto.js';
import { errorMessages } from '../../src/errors/errorMessages.js';

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
  });
});
