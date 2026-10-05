import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { PointTrialsService } from './point-trials.service.js';
import { PointTrialEntriesService } from './point-trial-entries.service.js';
import { UpdatePointTrialStatusDto } from '../../dtos/point-trials/point-trial.dto.js';
import { AddPointTrialParticipantDto, AddPointEntryDto } from '../../dtos/point-trials/point-trial-entry.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { HttpExceptionDto } from '../../dtos/http-exception.dto.js';

@ApiTags('Point Trials')
@Controller('events/:eventId/point-trial')
export class PointTrialsController {
  constructor(
    private readonly pointTrialsService: PointTrialsService,
    private readonly entriesService: PointTrialEntriesService,
  ) {}

  // --- Point Trial CRUD ---

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get point trial for an event (public)' })
  @ApiOkResponse({ description: 'Point trial with participants and best scores' })
  findByEvent(@Param('eventId') eventId: string) {
    return this.pointTrialsService.findByEventId(+eventId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('point-trials.manage')
  @ApiOperation({ summary: 'Create a point trial for an event (Admin only)' })
  @ApiCreatedResponse({ description: 'Point trial created' })
  @ApiBadRequestResponse({
    description: 'Event already has a point trial or invalid category',
    type: HttpExceptionDto,
  })
  @ApiNotFoundResponse({
    description: 'Event not found',
    type: HttpExceptionDto,
  })
  create(@Param('eventId') eventId: string) {
    return this.pointTrialsService.create(+eventId);
  }

  @Patch()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('point-trials.manage')
  @ApiOperation({ summary: 'Update point trial status (Admin only)' })
  @ApiOkResponse({ description: 'Point trial status updated' })
  @ApiBadRequestResponse({
    description: 'Invalid status transition',
    type: HttpExceptionDto,
  })
  updateStatus(@Param('eventId') eventId: string, @Body() dto: UpdatePointTrialStatusDto) {
    return this.pointTrialsService.updateStatus(+eventId, dto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('point-trials.manage')
  @ApiOperation({ summary: 'Delete point trial for an event (Admin only)' })
  @ApiOkResponse({ description: 'Point trial deleted' })
  @ApiNotFoundResponse({
    description: 'Point trial not found',
    type: HttpExceptionDto,
  })
  delete(@Param('eventId') eventId: string) {
    return this.pointTrialsService.delete(+eventId);
  }

  // --- Participant management ---

  @Post('participants')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('point-trials.manage')
  @ApiOperation({ summary: 'Add participant to point trial (Admin only)' })
  @ApiCreatedResponse({ description: 'Participant added' })
  addParticipant(@Param('eventId') eventId: string, @Body() dto: AddPointTrialParticipantDto) {
    return this.entriesService.addParticipant(+eventId, dto);
  }

  @Delete('participants/:participantId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('point-trials.manage')
  @ApiOperation({
    summary: 'Remove participant and all entries (Admin only)',
  })
  @ApiOkResponse({ description: 'Participant removed' })
  @ApiNotFoundResponse({
    description: 'Participant not found',
    type: HttpExceptionDto,
  })
  removeParticipant(@Param('eventId') eventId: string, @Param('participantId') participantId: string) {
    return this.entriesService.removeParticipant(+eventId, +participantId);
  }

  // --- Entry management ---

  @Public()
  @Get('participants/:participantId/entries')
  @ApiOperation({ summary: 'Get entry history for a participant (public)' })
  @ApiOkResponse({ description: 'List of entries sorted by points' })
  getEntries(@Param('eventId') eventId: string, @Param('participantId') participantId: string) {
    return this.entriesService.getEntries(+eventId, +participantId);
  }

  @Post('participants/:participantId/entries')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('point-trials.manage')
  @ApiOperation({ summary: 'Submit a new point entry (Admin only)' })
  @ApiCreatedResponse({ description: 'Entry recorded' })
  @ApiNotFoundResponse({
    description: 'Participant not found',
    type: HttpExceptionDto,
  })
  addEntry(@Param('eventId') eventId: string, @Param('participantId') participantId: string, @Body() dto: AddPointEntryDto) {
    return this.entriesService.addEntry(+eventId, +participantId, dto.points);
  }

  @Delete('entries/:entryId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('point-trials.manage')
  @ApiOperation({ summary: 'Delete a specific entry (Admin only)' })
  @ApiOkResponse({ description: 'Entry deleted' })
  @ApiNotFoundResponse({
    description: 'Entry not found',
    type: HttpExceptionDto,
  })
  deleteEntry(@Param('eventId') eventId: string, @Param('entryId') entryId: string) {
    return this.entriesService.deleteEntry(+eventId, +entryId);
  }
}
