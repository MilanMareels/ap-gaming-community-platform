import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RosterService } from '../../src/modules/roster/roster.service.js';
import { PrismaService } from '../../src/modules/prisma/prisma.service.js';

describe('RosterService', () => {
  let service: RosterService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      rosterGame: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      rosterEntry: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RosterService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RosterService>(RosterService);
    prisma = module.get(PrismaService);
  });

  describe('Roster Games', () => {
    it('should return all games with roster entries and users', async () => {
      const mockGames = [{ id: 1, name: 'Valorant', rosterEntries: [] }];
      prisma.rosterGame.findMany.mockResolvedValue(mockGames);

      const result = await service.findAllGames();

      expect(result).toEqual(mockGames);
      expect(prisma.rosterGame.findMany).toHaveBeenCalledWith({
        include: {
          rosterEntries: {
            include: {
              user: true,
            },
          },
        },
      });
    });

    it('should create a new game', async () => {
      const mockGame = { id: 1, name: 'League of Legends' };
      prisma.rosterGame.create.mockResolvedValue(mockGame);

      const result = await service.createGame('League of Legends');

      expect(result).toEqual(mockGame);
      expect(prisma.rosterGame.create).toHaveBeenCalledWith({
        data: { name: 'League of Legends' },
      });
    });

    it('should delete a game', async () => {
      prisma.rosterGame.delete.mockResolvedValue({ id: 1 });

      await service.deleteGame(1);

      expect(prisma.rosterGame.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('Roster Entries', () => {
    it('should return all entries ordered by id desc', async () => {
      const mockEntries = [{ id: 2 }, { id: 1 }];
      prisma.rosterEntry.findMany.mockResolvedValue(mockEntries);

      const result = await service.findAllEntries();

      expect(result).toEqual(mockEntries);
      expect(prisma.rosterEntry.findMany).toHaveBeenCalledWith({
        include: {
          user: true,
          game: true,
        },
        orderBy: {
          id: 'desc',
        },
      });
    });

    it('should delete an entry', async () => {
      prisma.rosterEntry.delete.mockResolvedValue({ id: 1 });

      await service.deleteEntry(1);

      expect(prisma.rosterEntry.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should create an entry and a new user if user does not exist', async () => {
      const dto = {
        sNumber: 's123456',
        name: 'John Doe',
        gameId: 1,
        handle: 'johndoe#euw',
        rank: 'Gold',
        role: 'Mid',
      };

      const mockUser = { id: 10, sNumber: dto.sNumber, name: dto.name };
      const mockEntry = { id: 1, userId: 10, gameId: 1 };

      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.rosterEntry.create.mockResolvedValue(mockEntry);

      const result = await service.createEntry(dto as any);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          sNumber: dto.sNumber,
          email: `${dto.sNumber}@student.ap.be`,
          name: dto.name,
        },
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.rosterEntry.create).toHaveBeenCalledWith({
        data: {
          userId: 10,
          gameId: dto.gameId,
          handle: dto.handle,
          rank: dto.rank,
          role: dto.role,
        },
        include: {
          user: true,
          game: true,
        },
      });
      expect(result).toEqual(mockEntry);
    });

    it('should create an entry and update user name if user exists and name is provided', async () => {
      const dto = {
        sNumber: 's123456',
        name: 'Jane Doe',
        gameId: 2,
        handle: 'jane#123',
        rank: 'Diamond',
        role: 'Support',
      };

      const existingUser = { id: 10, sNumber: dto.sNumber, name: 'Old Name' };
      const updatedUser = { ...existingUser, name: dto.name };
      const mockEntry = { id: 2, userId: 10, gameId: 2 };

      prisma.user.findFirst.mockResolvedValue(existingUser);
      prisma.user.update.mockResolvedValue(updatedUser);
      prisma.rosterEntry.create.mockResolvedValue(mockEntry);

      const result = await service.createEntry(dto as any);

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: existingUser.id },
        data: { name: dto.name },
      });
      expect(prisma.rosterEntry.create).toHaveBeenCalled();
      expect(result).toEqual(mockEntry);
    });

    it('should create an entry without updating user if user exists and no name is provided', async () => {
      const dto = {
        sNumber: 's123456',
        gameId: 2,
        handle: 'noname#123',
        rank: 'Silver',
        role: 'Jungle',
      };

      const existingUser = {
        id: 10,
        sNumber: dto.sNumber,
        name: 'Existing Name',
      };
      const mockEntry = { id: 3, userId: 10, gameId: 2 };

      prisma.user.findFirst.mockResolvedValue(existingUser);
      prisma.rosterEntry.create.mockResolvedValue(mockEntry);

      const result = await service.createEntry(dto as any);

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.rosterEntry.create).toHaveBeenCalledWith({
        data: {
          userId: 10,
          gameId: dto.gameId,
          handle: dto.handle,
          rank: dto.rank,
          role: dto.role,
        },
        include: {
          user: true,
          game: true,
        },
      });
      expect(result).toEqual(mockEntry);
    });
  });
});
