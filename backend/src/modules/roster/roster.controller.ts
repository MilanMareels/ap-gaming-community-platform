import { Controller, Get, Post, Patch, Body, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { RosterService } from './roster.service.js';
import { CreateRosterEntryDto, CreateRosterGameDto, ReorderRosterEntriesDto, UpdateRosterEntryDto } from '../../dtos/roster/roster.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { RbacService } from '../rbac/rbac.service.js';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { PrismaModel } from '../../_gen/prisma-class/index.js';

@ApiTags('Roster')
@Controller('roster')
export class RosterController {
  constructor(
    private readonly rosterService: RosterService,
    private readonly rbacService: RbacService,
  ) {}

  private canSeePlayerDetails(req: Request) {
    return this.rbacService.hasAnyPermission((req as Request & { user?: JwtPayload }).user, ['roster.manage']);
  }

  @UseGuards(JwtAuthGuard)
  @Public()
  @Get('games')
  @ApiOperation({ summary: 'Get all roster games with entries (player email/student number only for roster managers)' })
  @ApiOkResponse({ type: [PrismaModel.RosterGame] })
  async findAllGames(@Req() req: Request) {
    return this.rosterService.findAllGames(await this.canSeePlayerDetails(req));
  }

  @Post('games')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('roster.manage')
  @ApiOperation({ summary: 'Create a new roster game (Admin only)' })
  @ApiCreatedResponse({ type: PrismaModel.RosterGame })
  createGame(@Body() dto: CreateRosterGameDto) {
    return this.rosterService.createGame(dto.name);
  }

  @Delete('games/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('roster.manage')
  @ApiOperation({ summary: 'Delete a roster game (Admin only)' })
  deleteGame(@Param('id') id: string) {
    return this.rosterService.deleteGame(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Public()
  @Get('entries')
  @ApiOperation({ summary: 'Get all roster entries (player email/student number only for roster managers)' })
  @ApiOkResponse({ type: [PrismaModel.RosterEntry] })
  async findAllEntries(@Req() req: Request) {
    return this.rosterService.findAllEntries(await this.canSeePlayerDetails(req));
  }

  @Post('entries')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('roster.manage')
  @ApiOperation({ summary: 'Add a roster entry (Admin only)' })
  @ApiCreatedResponse({ type: PrismaModel.RosterEntry })
  createEntry(@Body() dto: CreateRosterEntryDto) {
    return this.rosterService.createEntry(dto, dto.imageKey ?? null);
  }

  @Patch('entries/reorder')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('roster.manage')
  @ApiOperation({ summary: 'Reorder roster entries (Admin only)' })
  reorderEntries(@Body() dto: ReorderRosterEntriesDto) {
    return this.rosterService.reorderEntries(dto);
  }

  @Patch('entries/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('roster.manage')
  @ApiOperation({ summary: 'Update a roster entry (Admin only)' })
  @ApiOkResponse({ type: PrismaModel.RosterEntry })
  updateEntry(@Param('id') id: string, @Body() dto: UpdateRosterEntryDto) {
    return this.rosterService.updateEntry(+id, dto, dto.imageKey);
  }

  @Delete('entries/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('roster.manage')
  @ApiOperation({ summary: 'Delete a roster entry (Admin only)' })
  deleteEntry(@Param('id') id: string) {
    return this.rosterService.deleteEntry(+id);
  }
}
