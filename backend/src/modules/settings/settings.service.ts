import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateAdminDto,
  UpdateSettingDto,
} from '../../dtos/admin/admin.dto.js';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllSettings() {
    return this.prisma.setting.findMany();
  }

  async getInventorySettings() {
    const inventoryKeys = [
      'pc',
      'ps5',
      'switch',
      'controller',
      'Nintendo Controllers',
    ];
    return this.prisma.setting.findMany({
      where: { key: { in: inventoryKeys } },
    });
  }

  async updateSetting(dto: UpdateSettingDto) {
    const existing = await this.prisma.setting.findUnique({
      where: { key: dto.key },
    });

    if (existing) {
      return this.prisma.setting.update({
        where: { key: dto.key },
        data: { value: dto.value },
      });
    }

    return this.prisma.setting.create({
      data: {
        key: dto.key,
        value: dto.value,
      },
    });
  }

  async getAllAdmins() {
    return this.prisma.adminUser.findMany({
      include: {
        user: true,
      },
    });
  }

  async createAdmin(dto: CreateAdminDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    const existingAdmin = await this.prisma.adminUser.findFirst({
      where: { userId: user.id },
    });

    if (existingAdmin) {
      throw new BadRequestException('This user is already an admin');
    }

    return this.prisma.adminUser.create({
      data: {
        userId: user.id,
      },
      include: {
        user: true,
      },
    });
  }

  async removeAdmin(id: number) {
    await this.prisma.adminUser.delete({ where: { id } });
  }
}
