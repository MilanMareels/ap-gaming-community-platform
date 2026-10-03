import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req, UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiCreatedResponse,
  ApiNotFoundResponse, ApiBadRequestResponse, ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { SpeedrunRunsService } from './speedrun-runs.service.js';
import { SubmitSpeedrunRunDto, UpdateSpeedrunRunDto, RejectSpeedrunRunDto } from '../../dtos/speedruns/speedrun-run.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { HttpExceptionDto } from '../../dtos/http-exception.dto.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

@ApiTags('Speedruns - Runs')
@Controller('speedruns')
export class SpeedrunRunsController {
  constructor(private readonly runsService: SpeedrunRunsService) {}

  // ── Public ──

  @Public()
  @Get('games/:slug/leaderboard')
  @ApiOperation({ summary: 'Get leaderboard for a game category (public)' })
  @ApiQuery({ name: 'categoryId', required: true, type: Number })
  @ApiQuery({ name: 'levelId', required: false, type: Number })
  @ApiNotFoundResponse({ type: HttpExceptionDto })
  getLeaderboard(
    @Param('slug') slug: string,
    @Query('categoryId') categoryId: string,
    @Query('levelId') levelId?: string,
    @Query() query?: Record<string, string>,
  ) {
    const subcategoryFilters: Record<string, string> = {};
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (key.startsWith('var-')) {
          subcategoryFilters[key.replace('var-', '')] = value;
        }
      }
    }

    return this.runsService.getLeaderboard(
      slug,
      +categoryId,
      levelId ? +levelId : undefined,
      Object.keys(subcategoryFilters).length > 0 ? subcategoryFilters : undefined,
    );
  }

  // ── Admin: Moderation (static routes BEFORE :id) ──

  @Get('runs/pending')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.review')
  @ApiOperation({ summary: 'Get all pending runs (Admin)' })
  findPending() {
    return this.runsService.findPending();
  }

  @Get('runs/mine')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get runs submitted by the current user' })
  findMyRuns(@Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException();
    return this.runsService.findByUser(user.sub);
  }

  @Get('games/:gameId/runs/pending')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.review')
  @ApiOperation({ summary: 'Get pending runs for a game (Admin)' })
  findPendingByGame(@Param('gameId') gameId: string) {
    return this.runsService.findPending(+gameId);
  }

  // ── Public: parameterized ──

  @Public()
  @Get('runs/:id')
  @ApiOperation({ summary: 'Get a run by ID (public)' })
  @ApiNotFoundResponse({ type: HttpExceptionDto })
  findById(@Param('id') id: string) {
    return this.runsService.findById(+id);
  }

  // ── Authenticated User ──

  @Post('runs')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit a speedrun' })
  @ApiCreatedResponse()
  @ApiBadRequestResponse({ type: HttpExceptionDto })
  submitRun(@Body() dto: SubmitSpeedrunRunDto, @Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException();
    return this.runsService.submitRun(user.sub, dto);
  }

  @Patch('runs/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Edit own pending run' })
  @ApiBadRequestResponse({ type: HttpExceptionDto })
  updateRun(@Param('id') id: string, @Body() dto: UpdateSpeedrunRunDto, @Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException();
    return this.runsService.updateRun(+id, user.sub, dto);
  }

  @Delete('runs/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete own pending run' })
  deleteRun(@Param('id') id: string, @Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException();
    return this.runsService.deleteRun(+id, user.sub, false);
  }

  // ── Admin: moderation actions ──

  @Patch('runs/:id/verify')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.review')
  @ApiOperation({ summary: 'Verify a pending run (Admin)' })
  verifyRun(@Param('id') id: string, @Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException();
    return this.runsService.verifyRun(+id, user.sub);
  }

  @Patch('runs/:id/reject')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.review')
  @ApiOperation({ summary: 'Reject a pending run (Admin)' })
  rejectRun(@Param('id') id: string, @Body() dto: RejectSpeedrunRunDto, @Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException();
    return this.runsService.rejectRun(+id, user.sub, dto.reason);
  }

  @Delete('runs/:id/admin')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.review')
  @ApiOperation({ summary: 'Delete any run (Admin)' })
  adminDeleteRun(@Param('id') id: string, @Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException();
    return this.runsService.deleteRun(+id, user.sub, true);
  }
}
