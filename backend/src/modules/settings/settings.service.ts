import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateSettingDto } from '../../dtos/admin/admin.dto.js';
import { UpdateFormDto } from '~/dtos/form/from.dto.js';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllSettings() {
    return this.prisma.setting.findMany();
  }

  async getPublicSettings() {
    const publicKeys = ['googleFormUrl', 'twitchChannel'];
    return this.prisma.setting.findMany({
      where: { key: { in: publicKeys } },
    });
  }

  async getInventorySettings() {
    const inventoryKeys = ['pc', 'ps5', 'switch', 'controller', 'Nintendo Controllers'];
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

  async getForm() {
    return this.prisma.form.findFirst();
  }

  async updateForm(dto: UpdateFormDto) {
    const existing = await this.prisma.form.findFirst();

    if (existing) {
      return this.prisma.form.update({
        where: { id: existing.id },
        data: { title: dto.title, url: dto.url },
      });
    }

    return this.prisma.form.create({
      data: {
        title: dto.title,
        url: dto.url,
      },
    });
  }
}
