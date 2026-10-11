import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
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
        where: { key: { in: ['googleFormUrl', 'twitchChannel'] } },
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

});
