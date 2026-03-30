import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TimetableService } from '../../src/modules/timetable/timetable.service.js';
import { PrismaService } from '../../src/modules/prisma/prisma.service.js';

describe('TimetableService', () => {
  let service: TimetableService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      timeTableEntry: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TimetableService>(TimetableService);
    prisma = module.get(PrismaService);
  });

  it('should return all timetable entries ordered by day and time', async () => {
    const mockResult = [{ id: 1, label: 'Test' }];
    prisma.timeTableEntry.findMany.mockResolvedValue(mockResult);

    const result = await service.findAll();

    expect(result).toEqual(mockResult);
    expect(prisma.timeTableEntry.findMany).toHaveBeenCalledWith({
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  });

  it('should create a new timetable entry and parse times correctly', async () => {
    const dto = {
      dayOfWeek: 1,
      startTime: '09:30',
      endTime: '11:00',
      label: 'Math',
      type: 'Class',
    };
    const mockCreated = { id: 1, ...dto };
    prisma.timeTableEntry.create.mockResolvedValue(mockCreated);

    const result = await service.create(dto as any);

    const expectedStart = new Date(0);
    expectedStart.setUTCHours(9, 30, 0, 0);

    const expectedEnd = new Date(0);
    expectedEnd.setUTCHours(11, 0, 0, 0);

    expect(result).toEqual(mockCreated);
    expect(prisma.timeTableEntry.create).toHaveBeenCalledWith({
      data: {
        dayOfWeek: 1,
        startTime: expectedStart,
        endTime: expectedEnd,
        label: 'Math',
        type: 'Class',
      },
    });
  });

  it('should update an existing timetable entry and parse times correctly', async () => {
    const dto = {
      startTime: '14:00',
      endTime: '16:45',
      label: 'Science',
      type: 'Lab',
    };
    const mockUpdated = { id: 1, ...dto };
    prisma.timeTableEntry.update.mockResolvedValue(mockUpdated);

    const result = await service.update(1, dto as any);

    const expectedStart = new Date(0);
    expectedStart.setUTCHours(14, 0, 0, 0);

    const expectedEnd = new Date(0);
    expectedEnd.setUTCHours(16, 45, 0, 0);

    expect(result).toEqual(mockUpdated);
    expect(prisma.timeTableEntry.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        startTime: expectedStart,
        endTime: expectedEnd,
        label: 'Science',
        type: 'Lab',
      },
    });
  });

  it('should delete a timetable entry by id', async () => {
    prisma.timeTableEntry.delete.mockResolvedValue({ id: 1 });

    await service.remove(1);

    expect(prisma.timeTableEntry.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });
});
