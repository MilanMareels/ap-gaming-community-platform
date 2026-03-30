import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { SettingsService } from '../../src/modules/settings/settings.service.js';
import { PrismaService } from '../../src/modules/prisma/prisma.service.js';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      setting: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      adminUser: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    prisma = module.get(PrismaService);
  });

  describe('Settings', () => {
    it('should return all settings', async () => {
      const mockSettings = [{ key: 'theme', value: 'dark' }];
      prisma.setting.findMany.mockResolvedValue(mockSettings);

      const result = await service.getAllSettings();

      expect(result).toEqual(mockSettings);
      expect(prisma.setting.findMany).toHaveBeenCalled();
    });

    it('should return public settings', async () => {
      prisma.setting.findMany.mockResolvedValue([]);

      await service.getPublicSettings();

      expect(prisma.setting.findMany).toHaveBeenCalledWith({
        where: { key: { in: ['googleFormUrl'] } },
      });
    });

    it('should return inventory settings', async () => {
      prisma.setting.findMany.mockResolvedValue([]);

      await service.getInventorySettings();

      expect(prisma.setting.findMany).toHaveBeenCalledWith({
        where: {
          key: {
            in: ['pc', 'ps5', 'switch', 'controller', 'Nintendo Controllers'],
          },
        },
      });
    });

    it('should update an existing setting', async () => {
      const dto = { key: 'theme', value: 'light' };
      prisma.setting.findUnique.mockResolvedValue({
        key: 'theme',
        value: 'dark',
      });
      prisma.setting.update.mockResolvedValue(dto);

      const result = await service.updateSetting(dto as any);

      expect(result).toEqual(dto);
      expect(prisma.setting.update).toHaveBeenCalledWith({
        where: { key: dto.key },
        data: { value: dto.value },
      });
      expect(prisma.setting.create).not.toHaveBeenCalled();
    });

    it('should create a new setting if it does not exist', async () => {
      const dto = { key: 'newSetting', value: 'newValue' };
      prisma.setting.findUnique.mockResolvedValue(null);
      prisma.setting.create.mockResolvedValue(dto);

      const result = await service.updateSetting(dto as any);

      expect(result).toEqual(dto);
      expect(prisma.setting.create).toHaveBeenCalledWith({
        data: { key: dto.key, value: dto.value },
      });
      expect(prisma.setting.update).not.toHaveBeenCalled();
    });
  });

  describe('Admin Users', () => {
    it('should return all admins', async () => {
      const mockAdmins = [{ id: 1, userId: 2, user: {} }];
      prisma.adminUser.findMany.mockResolvedValue(mockAdmins);

      const result = await service.getAllAdmins();

      expect(result).toEqual(mockAdmins);
      expect(prisma.adminUser.findMany).toHaveBeenCalledWith({
        include: { user: true },
      });
    });

    it('should remove an admin', async () => {
      prisma.adminUser.delete.mockResolvedValue({ id: 1 });

      await service.removeAdmin(1);

      expect(prisma.adminUser.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw BadRequestException if user is already an admin', async () => {
      const dto = {
        email: 'test@ap.be',
        sNumber: 's123',
        gmailEmail: 'test@gmail.com',
      };
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      prisma.adminUser.findFirst.mockResolvedValue({ id: 1, userId: 1 });

      await expect(service.createAdmin(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create admin for an existing user', async () => {
      const dto = {
        email: 'test@ap.be',
        sNumber: 's123',
        gmailEmail: 'TEST@gmail.com',
      };
      const mockUser = { id: 5, email: dto.email, sNumber: dto.sNumber };
      const expectedWhitelistKey = 'admin_whitelist.test@gmail.com';

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.adminUser.findFirst.mockResolvedValue(null);
      prisma.setting.upsert.mockResolvedValue({});
      prisma.adminUser.create.mockResolvedValue({
        id: 1,
        userId: 5,
        user: mockUser,
      });

      const result = await service.createAdmin(dto as any);

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.setting.upsert).toHaveBeenCalledWith({
        where: { key: expectedWhitelistKey },
        update: { value: '5' },
        create: { key: expectedWhitelistKey, value: '5' },
      });
      expect(prisma.adminUser.create).toHaveBeenCalledWith({
        data: { userId: 5 },
        include: { user: true },
      });
      expect(result.userId).toBe(5);
    });

    it('should create a new user and then make them an admin', async () => {
      const dto = {
        email: 'new@ap.be',
        sNumber: 's999',
        gmailEmail: 'new@gmail.com',
      };
      const mockUser = { id: 10, email: dto.email, sNumber: dto.sNumber };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.adminUser.findFirst.mockResolvedValue(null);
      prisma.setting.upsert.mockResolvedValue({});
      prisma.adminUser.create.mockResolvedValue({
        id: 2,
        userId: 10,
        user: mockUser,
      });

      const result = await service.createAdmin(dto as any);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: dto.email, sNumber: dto.sNumber },
      });
      expect(prisma.adminUser.create).toHaveBeenCalledWith({
        data: { userId: 10 },
        include: { user: true },
      });
      expect(result.userId).toBe(10);
    });
  });
});
