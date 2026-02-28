import { Injectable, BadRequestException } from '@nestjs/common';
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
    // 1) Find or create the User by student email
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          sNumber: dto.sNumber,
        },
      });
    }

    // 2) Ensure they are not already an admin
    const existingAdmin = await this.prisma.adminUser.findFirst({
      where: { userId: user.id },
    });

    if (existingAdmin) {
      throw new BadRequestException('This user is already an admin');
    }

    // 3) Whitelist the Gmail address so the Google OAuth callback can link it
    //    Store as a setting: "admin_whitelist.<gmailEmail>" → userId
    const whitelistKey = `admin_whitelist.${dto.gmailEmail.toLowerCase()}`;
    await this.prisma.setting.upsert({
      where: { key: whitelistKey },
      update: { value: String(user.id) },
      create: { key: whitelistKey, value: String(user.id) },
    });

    // 4) Create the AdminUser record
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
