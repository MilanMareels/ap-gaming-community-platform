import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SettingsService } from './settings.service.js';
import {
  CreateAdminDto,
  UpdateSettingDto,
} from '../../dtos/admin/admin.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { AdminGuard } from '../../guards/admin.guard.js';
import { PrismaModel } from '../../_gen/prisma-class/index.js';
import { Public } from '../auth/public.decorator.js';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, AdminGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Get public-facing settings (no auth required)' })
  @ApiOkResponse({ type: [PrismaModel.Setting] })
  getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }

  @Public()
  @Get('inventory')
  @ApiOperation({ summary: 'Get inventory counts (public)' })
  @ApiOkResponse({ type: [PrismaModel.Setting] })
  getInventorySettings() {
    return this.settingsService.getInventorySettings();
  }

  @Get()
  @ApiOperation({ summary: 'Get all settings (Admin only)' })
  @ApiOkResponse({ type: [PrismaModel.Setting] })
  getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Patch()
  @ApiOperation({ summary: 'Update a setting (Admin only)' })
  @ApiOkResponse({ type: PrismaModel.Setting })
  updateSetting(@Body() dto: UpdateSettingDto) {
    return this.settingsService.updateSetting(dto);
  }

  @Get('admins')
  @ApiOperation({ summary: 'Get all admin users (Admin only)' })
  @ApiOkResponse({ type: [PrismaModel.AdminUser] })
  getAllAdmins() {
    return this.settingsService.getAllAdmins();
  }

  @Post('admins')
  @ApiOperation({ summary: 'Add a new admin (Admin only)' })
  @ApiOkResponse({ type: PrismaModel.AdminUser })
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.settingsService.createAdmin(dto);
  }

  @Delete('admins/:id')
  @ApiOperation({ summary: 'Remove an admin (Admin only)' })
  removeAdmin(@Param('id') id: string) {
    return this.settingsService.removeAdmin(+id);
  }
}
