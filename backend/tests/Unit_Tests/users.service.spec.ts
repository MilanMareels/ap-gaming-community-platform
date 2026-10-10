import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UsersService } from '../../src/modules/users/users.service.js';
import { PrismaService } from '../../src/modules/prisma/prisma.service.js';

const userRow = (id: number) => ({
  id,
  name: `User ${id}`,
  email: `s${id}@student.ap.be`,
  sNumber: `s${id}`,
  adminUsers: [],
  googleSSOUsers: [],
  microsoftSSOUsers: [{ id }],
  userRoles: [],
  _count: { reservations: 2 },
});

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      user: { count: jest.fn(), findMany: jest.fn<any>().mockResolvedValue([]) },
      reservation: { groupBy: jest.fn<any>().mockResolvedValue([]) },
    };

    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(UsersService);
    prisma = module.get(PrismaService);
  });

  describe('list', () => {
    it('should return the requested page with pagination metadata', async () => {
      prisma.user.count.mockResolvedValue(60);
      prisma.user.findMany.mockResolvedValue([userRow(35), userRow(34)]);

      const result = await service.list({ page: 2, pageSize: 25 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 25, take: 25, orderBy: { id: 'desc' } }));
      expect(result).toMatchObject({ total: 60, page: 2, pageSize: 25, totalPages: 3 });
      expect(result.items.map((u) => u.id)).toEqual([35, 34]);
      expect(result.items[0]).toMatchObject({ microsoftLinked: true, reservationCount: 2, noShowCount: 0 });
    });

    it('should default to the first page of 25 users', async () => {
      prisma.user.count.mockResolvedValue(3);

      const result = await service.list({});

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 25 }));
      expect(result).toMatchObject({ page: 1, pageSize: 25, totalPages: 1 });
    });

    it('should clamp a page number past the end to the last page', async () => {
      prisma.user.count.mockResolvedValue(30);

      const result = await service.list({ page: 9, pageSize: 25 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 25, take: 25 }));
      expect(result.page).toBe(2);
    });

    it('should report one empty page when nothing matches', async () => {
      prisma.user.count.mockResolvedValue(0);

      const result = await service.list({ search: 'nobody', page: 3 });

      expect(result).toMatchObject({ items: [], total: 0, page: 1, totalPages: 1 });
    });

    it('should apply the search filter to both the count and the page query', async () => {
      prisma.user.count.mockResolvedValue(0);

      await service.list({ search: 'jamie' });

      const expectedWhere = {
        OR: [
          { name: { contains: 'jamie', mode: 'insensitive' } },
          { email: { contains: 'jamie', mode: 'insensitive' } },
          { sNumber: { contains: 'jamie', mode: 'insensitive' } },
        ],
      };
      expect(prisma.user.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }));
    });
  });
});
