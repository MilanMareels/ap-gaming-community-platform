import { Controller, Get, Body, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SettingsService } from './settings.service.js';
import { UpdateSettingDto } from '../../dtos/admin/admin.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { PrismaModel } from '../../_gen/prisma-class/index.js';
import { Public } from '../auth/public.decorator.js';
import { UpdateFormDto } from '../../dtos/form/from.dto.js';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermissions('settings.manage')
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

  @Public()
  @Get('form')
  @ApiOperation({ summary: 'Get the single form' })
  getForm() {
    return this.settingsService.getForm();
  }

  @Patch('form')
  @ApiOperation({ summary: 'Update the single form' })
  updateForm(@Body() dto: UpdateFormDto) {
    return this.settingsService.updateForm(dto);
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
}
