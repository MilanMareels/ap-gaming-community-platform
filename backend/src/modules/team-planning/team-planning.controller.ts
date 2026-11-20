import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PLANNING_ADMIN_PERMISSION, PlanningViewer, TeamPlanningService } from './team-planning.service.js';
import {
  AddPlanningDaysDto,
  AddPlanningMemberDto,
  CreatePlanningBlockDto,
  CreatePlanningTeamDto,
  PlanningAddDaysResultDto,
  PlanningBlockDto,
  PlanningTeamDetailDto,
  PlanningTeamSummaryDto,
  PlanningTeamViewDto,
  PlanningTeamViewQueryDto,
  SaveAvailabilityDto,
  UpdatePlanningBlockDto,
  UpdatePlanningDayDto,
  UpdatePlanningMemberDto,
  UpdatePlanningTeamDto,
} from '../../dtos/team-planning/team-planning.dto.js';
import { PersonDto, PersonSearchQueryDto } from '../../dtos/people/person.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { RbacService } from '../rbac/rbac.service.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

/**
 * Players fill in their availability; team managers (per team) and planning admins plan teams in the admin UI.
 * Access depends on team membership, so it is checked in the service rather than with permission guards.
 */
@ApiTags('Team planning')
@Controller('team-planning')
@UseGuards(JwtAuthGuard)
export class TeamPlanningController {
  constructor(
    private readonly planning: TeamPlanningService,
    private readonly rbac: RbacService,
  ) {}

  private async viewer(req: Request): Promise<PlanningViewer> {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException('Unauthorized');
    return { userId: user.sub, isPlanningAdmin: await this.rbac.hasAnyPermission(user, [PLANNING_ADMIN_PERMISSION]) };
  }

  // ── Players ──

  @Get('my-teams')
  @ApiOperation({ summary: 'Teams the signed-in user plays in' })
  @ApiOkResponse({ type: [PlanningTeamSummaryDto] })
  async myTeams(@Req() req: Request) {
    return this.planning.myTeams(await this.viewer(req));
  }

  @Get('teams/:teamId')
  @ApiOperation({ summary: "A team's planned days with everyone's availability (players, its managers and planning admins)" })
  @ApiOkResponse({ type: PlanningTeamViewDto })
  async teamView(@Param('teamId', ParseIntPipe) teamId: number, @Query() query: PlanningTeamViewQueryDto, @Req() req: Request) {
    return this.planning.teamView(teamId, await this.viewer(req), query.past);
  }

  @Put('teams/:teamId/availability')
  @HttpCode(204)
  @ApiOperation({ summary: "Save availability cells: your own, or anyone's on a team you manage. A null status clears a cell." })
  @ApiNoContentResponse()
  async saveAvailability(@Param('teamId', ParseIntPipe) teamId: number, @Body() dto: SaveAvailabilityDto, @Req() req: Request) {
    await this.planning.saveAvailability(teamId, await this.viewer(req), dto);
  }

  // ── Managers (admin UI) ──

  @Get('admin/teams')
  @ApiOperation({ summary: 'Teams the signed-in user manages (all teams for planning admins)' })
  @ApiOkResponse({ type: [PlanningTeamSummaryDto] })
  async adminTeams(@Req() req: Request) {
    return this.planning.adminTeams(await this.viewer(req));
  }

  @Post('admin/teams')
  @ApiOperation({ summary: 'Create a team (planning admins)' })
  @ApiCreatedResponse({ type: PlanningTeamSummaryDto })
  async createTeam(@Body() dto: CreatePlanningTeamDto, @Req() req: Request) {
    return this.planning.createTeam(await this.viewer(req), dto);
  }

  @Get('admin/teams/:teamId')
  @ApiOperation({ summary: 'Members and planned days of a team you manage' })
  @ApiOkResponse({ type: PlanningTeamDetailDto })
  async teamDetail(@Param('teamId', ParseIntPipe) teamId: number, @Req() req: Request) {
    return this.planning.teamDetail(teamId, await this.viewer(req));
  }

  @Patch('admin/teams/:teamId')
  @ApiOperation({ summary: 'Rename a team you manage' })
  @ApiOkResponse({ type: PlanningTeamSummaryDto })
  async updateTeam(@Param('teamId', ParseIntPipe) teamId: number, @Body() dto: UpdatePlanningTeamDto, @Req() req: Request) {
    return this.planning.updateTeam(teamId, await this.viewer(req), dto);
  }

  @Delete('admin/teams/:teamId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a team (planning admins)' })
  @ApiNoContentResponse()
  async deleteTeam(@Param('teamId', ParseIntPipe) teamId: number, @Req() req: Request) {
    await this.planning.deleteTeam(teamId, await this.viewer(req));
  }

  @Get('admin/people')
  @ApiOperation({ summary: 'Search people to add to a team, by name, email or student number' })
  @ApiOkResponse({ type: [PersonDto] })
  async searchPeople(@Query() query: PersonSearchQueryDto, @Req() req: Request) {
    return this.planning.searchPeople(await this.viewer(req), query.search);
  }

  @Post('admin/teams/:teamId/members')
  @ApiOperation({ summary: 'Add a player or manager to a team' })
  @ApiNoContentResponse()
  @HttpCode(204)
  async addMember(@Param('teamId', ParseIntPipe) teamId: number, @Body() dto: AddPlanningMemberDto, @Req() req: Request) {
    await this.planning.addMember(teamId, await this.viewer(req), dto);
  }

  @Patch('admin/members/:memberId')
  @HttpCode(204)
  @ApiOperation({ summary: "Change a member's handle or role" })
  @ApiNoContentResponse()
  async updateMember(@Param('memberId', ParseIntPipe) memberId: number, @Body() dto: UpdatePlanningMemberDto, @Req() req: Request) {
    await this.planning.updateMember(memberId, await this.viewer(req), dto);
  }

  @Delete('admin/members/:memberId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove someone from a team' })
  @ApiNoContentResponse()
  async removeMember(@Param('memberId', ParseIntPipe) memberId: number, @Req() req: Request) {
    await this.planning.removeMember(memberId, await this.viewer(req));
  }

  @Post('admin/teams/:teamId/days')
  @ApiOperation({ summary: 'Plan one or more dates for a team' })
  @ApiCreatedResponse({ type: PlanningAddDaysResultDto })
  async addDays(@Param('teamId', ParseIntPipe) teamId: number, @Body() dto: AddPlanningDaysDto, @Req() req: Request) {
    return this.planning.addDays(teamId, await this.viewer(req), dto);
  }

  @Patch('admin/days/:dayId')
  @HttpCode(204)
  @ApiOperation({ summary: "Change a planned day's hours or note" })
  @ApiNoContentResponse()
  async updateDay(@Param('dayId', ParseIntPipe) dayId: number, @Body() dto: UpdatePlanningDayDto, @Req() req: Request) {
    await this.planning.updateDay(dayId, await this.viewer(req), dto);
  }

  @Delete('admin/days/:dayId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a planned day' })
  @ApiNoContentResponse()
  async removeDay(@Param('dayId', ParseIntPipe) dayId: number, @Req() req: Request) {
    await this.planning.removeDay(dayId, await this.viewer(req));
  }

  @Post('admin/days/:dayId/blocks')
  @ApiOperation({ summary: 'Plan a scrim, VOD review or match during a day' })
  @ApiCreatedResponse({ type: PlanningBlockDto })
  async addBlock(@Param('dayId', ParseIntPipe) dayId: number, @Body() dto: CreatePlanningBlockDto, @Req() req: Request) {
    return this.planning.addBlock(dayId, await this.viewer(req), dto);
  }

  @Patch('admin/blocks/:blockId')
  @ApiOperation({ summary: 'Change a planned block' })
  @ApiOkResponse({ type: PlanningBlockDto })
  async updateBlock(@Param('blockId', ParseIntPipe) blockId: number, @Body() dto: UpdatePlanningBlockDto, @Req() req: Request) {
    return this.planning.updateBlock(blockId, await this.viewer(req), dto);
  }

  @Delete('admin/blocks/:blockId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a planned block' })
  @ApiNoContentResponse()
  async removeBlock(@Param('blockId', ParseIntPipe) blockId: number, @Req() req: Request) {
    await this.planning.removeBlock(blockId, await this.viewer(req));
  }
}
