import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EventsService } from '../../src/modules/events/events.service.js';
import { PrismaService } from '../../src/modules/prisma/prisma.service.js';

describe('EventsService', () => {
  let service: EventsService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      event: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    prisma = module.get(PrismaService);
  });

  describe('findAll', () => {
    it('should return all events ordered by startTime', async () => {
      const mockEvents = [{ id: 1, title: 'Test Event' }];
      prisma.event.findMany.mockResolvedValue(mockEvents);

      const result = await service.findAll();

      expect(result).toEqual(mockEvents);
      expect(prisma.event.findMany).toHaveBeenCalledWith({
        orderBy: { startTime: 'asc' },
      });
    });
  });

  describe('findUpcoming', () => {
    it('should return events where endTime is in the future', async () => {
      const mockEvents = [{ id: 2, title: 'Future Event' }];
      prisma.event.findMany.mockResolvedValue(mockEvents);

      const result = await service.findUpcoming();

      expect(result).toEqual(mockEvents);
      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: {
          endTime: { gte: expect.any(Date) },
        },
        orderBy: { startTime: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('should create a new event and parse dates', async () => {
      const dto = {
        title: 'New Event',
        startTime: '2026-03-01T10:00:00Z',
        endTime: '2026-03-01T12:00:00Z',
        type: 'Tournament',
      };
      const mockCreated = {
        id: 1,
        ...dto,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      };
      prisma.event.create.mockResolvedValue(mockCreated);

      const result = await service.create(dto as any);

      expect(result).toEqual(mockCreated);
      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          title: 'New Event',
          startTime: new Date('2026-03-01T10:00:00Z'),
          endTime: new Date('2026-03-01T12:00:00Z'),
          type: 'Tournament',
        },
      });
    });
  });

  describe('update', () => {
    it('should update all fields if provided', async () => {
      const dto = {
        title: 'Updated Event',
        startTime: '2026-03-02T10:00:00Z',
        endTime: '2026-03-02T12:00:00Z',
        type: 'Casual',
      };
      const mockUpdated = { id: 1 };
      prisma.event.update.mockResolvedValue(mockUpdated);

      const result = await service.update(1, dto as any);

      expect(result).toEqual(mockUpdated);
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          title: 'Updated Event',
          startTime: new Date('2026-03-02T10:00:00Z'),
          endTime: new Date('2026-03-02T12:00:00Z'),
          type: 'Casual',
        },
      });
    });

    it('should only update provided fields', async () => {
      const dto = {
        title: 'Partially Updated Event',
      };
      const mockUpdated = { id: 1 };
      prisma.event.update.mockResolvedValue(mockUpdated);

      const result = await service.update(1, dto as any);

      expect(result).toEqual(mockUpdated);
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          title: 'Partially Updated Event',
        },
      });
    });

    it('should not update any fields if dto is empty', async () => {
      const dto = {};
      const mockUpdated = { id: 1 };
      prisma.event.update.mockResolvedValue(mockUpdated);

      const result = await service.update(1, dto as any);

      expect(result).toEqual(mockUpdated);
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {},
      });
    });
  });

  describe('delete', () => {
    it('should delete an event by id', async () => {
      prisma.event.delete.mockResolvedValue({ id: 1 });

      await service.delete(1);

      expect(prisma.event.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
