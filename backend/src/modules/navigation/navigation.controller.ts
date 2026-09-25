import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { NavigationService } from './navigation.service.js';
import { CreateNavLinkDto, UpdateNavLinkDto, ReorderNavLinksDto } from '../../dtos/navigation/navigation.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { AdminGuard } from '../../guards/admin.guard.js';
import { Public } from '../auth/public.decorator.js';
import { PrismaModel } from '../../_gen/prisma-class/index.js';

@ApiTags('Navigation')
@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get navigation tree (public)' })
  @ApiOkResponse({ type: [PrismaModel.NavLink] })
  getNavTree() {
    return this.navigationService.getNavTree();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get all nav links flat (Admin only)' })
  @ApiOkResponse({ type: [PrismaModel.NavLink] })
  getAllFlat() {
    return this.navigationService.getAllFlat();
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Create a nav link (Admin only)' })
  @ApiCreatedResponse({ type: PrismaModel.NavLink })
  create(@Body() dto: CreateNavLinkDto) {
    return this.navigationService.create(dto);
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Reorder nav links (Admin only)' })
  reorder(@Body() dto: ReorderNavLinksDto) {
    return this.navigationService.reorder(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Update a nav link (Admin only)' })
  @ApiOkResponse({ type: PrismaModel.NavLink })
  update(@Param('id') id: string, @Body() dto: UpdateNavLinkDto) {
    return this.navigationService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Delete a nav link (Admin only)' })
  delete(@Param('id') id: string) {
    return this.navigationService.delete(+id);
  }
}
