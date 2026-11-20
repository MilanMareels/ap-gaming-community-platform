import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SCHEDULE_MANAGE_PERMISSION, ScheduleViewer, TeamScheduleService } from './team-schedule.service.js';
import {
  CreateScheduleBlockDto,
  TeamScheduleBlockDto,
  TeamScheduleGameDto,
  TeamScheduleTeamDto,
  TeamScheduleWeekDto,
  TeamScheduleWeekQueryDto,
  UpdateAvailabilityDto,
  UpdateScheduleBlockDto,
  UpdateScheduleHoursDto,
} from '../../dtos/team-schedule/team-schedule.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { RbacService } from '../rbac/rbac.service.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

@ApiTags('Team schedule')
@Controller('team-schedule')
@UseGuards(JwtAuthGuard)
export class TeamScheduleController {
  constructor(
    private readonly teamSchedule: TeamScheduleService,
    private readonly rbac: RbacService,
  ) {}

  private async viewer(req: Request): Promise<ScheduleViewer> {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException('Unauthorized');
    return { userId: user.sub, canManage: await this.rbac.hasAnyPermission(user, [SCHEDULE_MANAGE_PERMISSION]) };
  }

  @Get('games')
  @ApiOperation({ summary: 'Teams whose schedule the signed-in user can see (their own, or all for schedule managers)' })
  @ApiOkResponse({ type: [TeamScheduleTeamDto] })
  async listTeams(@Req() req: Request) {
    return this.teamSchedule.listTeams(await this.viewer(req));
  }

  @Get('games/:gameId')
  @ApiOperation({ summary: "One week of a team's availability grid and planned blocks" })
  @ApiOkResponse({ type: TeamScheduleWeekDto })
  async getWeek(@Param('gameId', ParseIntPipe) gameId: number, @Query() query: TeamScheduleWeekQueryDto, @Req() req: Request) {
    return this.teamSchedule.getWeek(gameId, await this.viewer(req), query.week);
  }

  @Put('games/:gameId/availability')
  @HttpCode(204)
  @ApiOperation({ summary: "Save availability cells (your own; anyone's for schedule managers). A null status clears a cell." })
  @ApiNoContentResponse()
  async updateAvailability(@Param('gameId', ParseIntPipe) gameId: number, @Body() dto: UpdateAvailabilityDto, @Req() req: Request) {
    await this.teamSchedule.updateAvailability(gameId, await this.viewer(req), dto);
  }

  @Patch('games/:gameId/hours')
  @UseGuards(PermissionGuard)
  @RequirePermissions(SCHEDULE_MANAGE_PERMISSION)
  @ApiOperation({ summary: "Set the hours shown in a team's grid" })
  @ApiOkResponse({ type: TeamScheduleGameDto })
  updateHours(@Param('gameId', ParseIntPipe) gameId: number, @Body() dto: UpdateScheduleHoursDto) {
    return this.teamSchedule.updateHours(gameId, dto);
  }

  @Post('games/:gameId/blocks')
  @UseGuards(PermissionGuard)
  @RequirePermissions(SCHEDULE_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Plan a scrim, practice or match for the whole team' })
  @ApiCreatedResponse({ type: TeamScheduleBlockDto })
  createBlock(@Param('gameId', ParseIntPipe) gameId: number, @Body() dto: CreateScheduleBlockDto) {
    return this.teamSchedule.createBlock(gameId, dto);
  }

  @Patch('blocks/:id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(SCHEDULE_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Change a planned block' })
  @ApiOkResponse({ type: TeamScheduleBlockDto })
  updateBlock(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScheduleBlockDto) {
    return this.teamSchedule.updateBlock(id, dto);
  }

  @Delete('blocks/:id')
  @HttpCode(204)
  @UseGuards(PermissionGuard)
  @RequirePermissions(SCHEDULE_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Remove a planned block' })
  @ApiNoContentResponse()
  removeBlock(@Param('id', ParseIntPipe) id: number) {
    return this.teamSchedule.removeBlock(id);
  }
}
