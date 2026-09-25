import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { TimeTrialsService } from './time-trials.service.js';
import { TimeTrialEntriesService } from './time-trial-entries.service.js';
import { UpdateTimeTrialStatusDto } from '../../dtos/time-trials/time-trial.dto.js';
import {
  AddTimeTrialParticipantDto,
  AddRunDto,
} from '../../dtos/time-trials/time-trial-entry.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { AdminGuard } from '../../guards/admin.guard.js';
import { Public } from '../auth/public.decorator.js';
import { HttpExceptionDto } from '../../dtos/http-exception.dto.js';

@ApiTags('Time Trials')
@Controller('events/:eventId/time-trial')
export class TimeTrialsController {
  constructor(
    private readonly timeTrialsService: TimeTrialsService,
    private readonly entriesService: TimeTrialEntriesService,
  ) {}

  // --- Time Trial CRUD ---

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get time trial for an event (public)' })
  @ApiOkResponse({ description: 'Time trial with participants and best times' })
  findByEvent(@Param('eventId') eventId: string) {
    return this.timeTrialsService.findByEventId(+eventId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Create a time trial for an event (Admin only)' })
  @ApiCreatedResponse({ description: 'Time trial created' })
  @ApiBadRequestResponse({
    description: 'Event already has a time trial or invalid category',
    type: HttpExceptionDto,
  })
  @ApiNotFoundResponse({
    description: 'Event not found',
    type: HttpExceptionDto,
  })
  create(@Param('eventId') eventId: string) {
    return this.timeTrialsService.create(+eventId);
  }

  @Patch()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Update time trial status (Admin only)' })
  @ApiOkResponse({ description: 'Time trial status updated' })
  @ApiBadRequestResponse({
    description: 'Invalid status transition',
    type: HttpExceptionDto,
  })
  updateStatus(
    @Param('eventId') eventId: string,
    @Body() dto: UpdateTimeTrialStatusDto,
  ) {
    return this.timeTrialsService.updateStatus(+eventId, dto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Delete time trial for an event (Admin only)' })
  @ApiOkResponse({ description: 'Time trial deleted' })
  @ApiNotFoundResponse({
    description: 'Time trial not found',
    type: HttpExceptionDto,
  })
  delete(@Param('eventId') eventId: string) {
    return this.timeTrialsService.delete(+eventId);
  }

  // --- Participant management ---

  @Post('participants')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Add participant to time trial (Admin only)' })
  @ApiCreatedResponse({ description: 'Participant added' })
  addParticipant(
    @Param('eventId') eventId: string,
    @Body() dto: AddTimeTrialParticipantDto,
  ) {
    return this.entriesService.addParticipant(+eventId, dto);
  }

  @Delete('participants/:participantId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: 'Remove participant and all runs (Admin only)',
  })
  @ApiOkResponse({ description: 'Participant removed' })
  @ApiNotFoundResponse({
    description: 'Participant not found',
    type: HttpExceptionDto,
  })
  removeParticipant(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
  ) {
    return this.entriesService.removeParticipant(+eventId, +participantId);
  }

  // --- Run management ---

  @Public()
  @Get('participants/:participantId/runs')
  @ApiOperation({ summary: 'Get run history for a participant (public)' })
  @ApiOkResponse({ description: 'List of runs sorted by time' })
  getRuns(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
  ) {
    return this.entriesService.getRuns(+eventId, +participantId);
  }

  @Post('participants/:participantId/runs')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Submit a new run time (Admin only)' })
  @ApiCreatedResponse({ description: 'Run recorded' })
  @ApiNotFoundResponse({
    description: 'Participant not found',
    type: HttpExceptionDto,
  })
  addRun(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
    @Body() dto: AddRunDto,
  ) {
    return this.entriesService.addRun(+eventId, +participantId, dto.timeMs);
  }

  @Delete('runs/:runId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Delete a specific run (Admin only)' })
  @ApiOkResponse({ description: 'Run deleted' })
  @ApiNotFoundResponse({
    description: 'Run not found',
    type: HttpExceptionDto,
  })
  deleteRun(
    @Param('eventId') eventId: string,
    @Param('runId') runId: string,
  ) {
    return this.entriesService.deleteRun(+eventId, +runId);
  }
}
