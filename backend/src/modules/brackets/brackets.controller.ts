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
import { BracketsService } from './brackets.service.js';
import { BracketParticipantsService } from './bracket-participants.service.js';
import { BracketMatchesService } from './bracket-matches.service.js';
import { BracketGeneratorService } from './bracket-generator.service.js';
import {
  CreateBracketDto,
  UpdateBracketDto,
} from '../../dtos/brackets/bracket.dto.js';
import { AddParticipantDto } from '../../dtos/brackets/bracket-participant.dto.js';
import {
  UpdateMatchResultDto,
  SwapParticipantsDto,
} from '../../dtos/brackets/bracket-match.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { HttpExceptionDto } from '../../dtos/http-exception.dto.js';

@ApiTags('Brackets')
@Controller('events/:eventId/bracket')
export class BracketsController {
  constructor(
    private readonly bracketsService: BracketsService,
    private readonly participantsService: BracketParticipantsService,
    private readonly matchesService: BracketMatchesService,
    private readonly generatorService: BracketGeneratorService,
  ) {}

  // --- Bracket CRUD ---

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get bracket for an event (public)' })
  @ApiOkResponse({ description: 'Bracket with participants and matches' })
  findByEvent(@Param('eventId') eventId: string) {
    return this.bracketsService.findByEventId(+eventId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('brackets.manage')
  @ApiOperation({ summary: 'Create a bracket for an event (Admin only)' })
  @ApiCreatedResponse({ description: 'Bracket created' })
  @ApiBadRequestResponse({
    description: 'Event already has a bracket or invalid category',
    type: HttpExceptionDto,
  })
  @ApiNotFoundResponse({
    description: 'Event not found',
    type: HttpExceptionDto,
  })
  create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateBracketDto,
  ) {
    return this.bracketsService.create(+eventId, dto);
  }

  @Patch()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('brackets.manage')
  @ApiOperation({ summary: 'Update bracket settings (Admin only)' })
  @ApiOkResponse({ description: 'Bracket updated' })
  @ApiBadRequestResponse({
    description: 'Can only update in DRAFT status',
    type: HttpExceptionDto,
  })
  update(
    @Param('eventId') eventId: string,
    @Body() dto: UpdateBracketDto,
  ) {
    return this.bracketsService.update(+eventId, dto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('brackets.manage')
  @ApiOperation({ summary: 'Delete bracket for an event (Admin only)' })
  @ApiOkResponse({ description: 'Bracket deleted' })
  @ApiNotFoundResponse({
    description: 'Bracket not found',
    type: HttpExceptionDto,
  })
  delete(@Param('eventId') eventId: string) {
    return this.bracketsService.delete(+eventId);
  }

  // --- Participant management ---

  @Post('participants')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('brackets.manage')
  @ApiOperation({ summary: 'Add participant to bracket (Admin only)' })
  @ApiCreatedResponse({ description: 'Participant added' })
  @ApiBadRequestResponse({
    description: 'Can only add in DRAFT status',
    type: HttpExceptionDto,
  })
  addParticipant(
    @Param('eventId') eventId: string,
    @Body() dto: AddParticipantDto,
  ) {
    return this.participantsService.addParticipant(+eventId, dto);
  }

  @Post('participants/import')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('brackets.manage')
  @ApiOperation({
    summary: 'Import participants from event registrations (Admin only)',
  })
  @ApiCreatedResponse({ description: 'Participants imported' })
  @ApiBadRequestResponse({
    description: 'Can only import in DRAFT status',
    type: HttpExceptionDto,
  })
  importParticipants(@Param('eventId') eventId: string) {
    return this.participantsService.importFromRegistrations(+eventId);
  }

  @Delete('participants/:participantId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('brackets.manage')
  @ApiOperation({
    summary: 'Remove participant from bracket (Admin only)',
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
    return this.participantsService.removeParticipant(
      +eventId,
      +participantId,
    );
  }

  // --- Bracket generation ---

  @Post('generate')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('brackets.manage')
  @ApiOperation({ summary: 'Generate bracket structure (Admin only)' })
  @ApiCreatedResponse({ description: 'Bracket generated' })
  @ApiBadRequestResponse({
    description: 'Already generated or insufficient participants',
    type: HttpExceptionDto,
  })
  generate(@Param('eventId') eventId: string) {
    return this.generatorService.generate(+eventId);
  }

  // --- Participant swapping ---

  @Post('swap-participants')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('brackets.manage')
  @ApiOperation({
    summary:
      'Swap two participants in round 1 matches (Admin only, GENERATED status)',
  })
  @ApiOkResponse({ description: 'Participants swapped' })
  @ApiBadRequestResponse({
    description: 'Bracket not in GENERATED status or scores already entered',
    type: HttpExceptionDto,
  })
  swapParticipants(
    @Param('eventId') eventId: string,
    @Body() dto: SwapParticipantsDto,
  ) {
    return this.matchesService.swapParticipants(
      +eventId,
      dto.participantAId,
      dto.participantBId,
    );
  }

  // --- Match management ---

  @Patch('matches/:matchId/status')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('brackets.manage')
  @ApiOperation({ summary: 'Update match status (Admin only)' })
  @ApiOkResponse({ description: 'Match status updated' })
  @ApiBadRequestResponse({
    description: 'Cannot change status',
    type: HttpExceptionDto,
  })
  updateMatchStatus(
    @Param('eventId') eventId: string,
    @Param('matchId') matchId: string,
    @Body('status') status: 'IN_PROGRESS' | 'PENDING',
  ) {
    return this.matchesService.updateMatchStatus(+eventId, +matchId, status);
  }

  @Post('matches/:matchId/result')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('brackets.manage')
  @ApiOperation({ summary: 'Submit match result (Admin only)' })
  @ApiCreatedResponse({ description: 'Result submitted and bracket updated' })
  @ApiBadRequestResponse({
    description: 'Invalid participants or match already completed',
    type: HttpExceptionDto,
  })
  submitResult(
    @Param('eventId') eventId: string,
    @Param('matchId') matchId: string,
    @Body() dto: UpdateMatchResultDto,
  ) {
    return this.matchesService.submitResult(+eventId, +matchId, dto);
  }
}
