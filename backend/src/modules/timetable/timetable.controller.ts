import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { TimetableService } from './timetable.service.js';
import { CreateTimeTableEntryDto, UpdateTimeTableEntryDto } from '../../dtos/timetable/timetable.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { PrismaModel } from '../../_gen/prisma-class/index.js';

@ApiTags('Timetable')
@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all timetable entries' })
  @ApiOkResponse({ type: [PrismaModel.TimeTableEntry] })
  findAll() {
    return this.timetableService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('timetable.manage')
  @ApiOperation({ summary: 'Create a timetable entry (Admin only)' })
  @ApiCreatedResponse({ type: PrismaModel.TimeTableEntry })
  create(@Body() dto: CreateTimeTableEntryDto) {
    return this.timetableService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('timetable.manage')
  @ApiOperation({ summary: 'Update a timetable entry (Admin only)' })
  @ApiOkResponse({ type: PrismaModel.TimeTableEntry })
  update(@Param('id') id: string, @Body() dto: UpdateTimeTableEntryDto) {
    return this.timetableService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('timetable.manage')
  @ApiOperation({ summary: 'Delete a timetable entry (Admin only)' })
  remove(@Param('id') id: string) {
    return this.timetableService.remove(+id);
  }
}
