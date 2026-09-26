import { Controller, Get, Post, Patch, Body, Delete, Param, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { EventsService } from './events.service.js';
import { EventRegistrationsService } from './event-registrations.service.js';
import { CreateEventDto, UpdateEventDto } from '../../dtos/events/event.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { Public } from '../auth/public.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { HttpExceptionDto } from '../../dtos/http-exception.dto.js';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly eventRegistrationsService: EventRegistrationsService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get upcoming events (public)' })
  @ApiOkResponse({ type: [CreateEventDto] })
  findUpcoming() {
    return this.eventsService.findUpcoming();
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('events.manage')
  @ApiOperation({ summary: 'Get all events (Admin only)' })
  @ApiOkResponse({ type: [CreateEventDto] })
  findAll() {
    return this.eventsService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single event by ID (public)' })
  @ApiOkResponse({ type: CreateEventDto })
  @ApiNotFoundResponse({ description: 'Event not found', type: HttpExceptionDto })
  findById(@Param('id') id: string) {
    return this.eventsService.findById(+id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('events.manage')
  @ApiOperation({ summary: 'Create a new event (Admin only)' })
  @ApiCreatedResponse({ type: CreateEventDto })
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('events.manage')
  @ApiOperation({ summary: 'Update an event (Admin only)' })
  @ApiOkResponse({ type: CreateEventDto })
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('events.manage')
  @ApiOperation({ summary: 'Delete an event (Admin only)' })
  delete(@Param('id') id: string) {
    return this.eventsService.delete(+id);
  }

  // --- Registration endpoints ---

  @Post(':id/register')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Register current user for an event' })
  @ApiCreatedResponse({ description: 'Registration created' })
  @ApiBadRequestResponse({ description: 'Registration not enabled or already registered', type: HttpExceptionDto })
  @ApiNotFoundResponse({ description: 'Event not found', type: HttpExceptionDto })
  register(@Param('id') id: string, @Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException('Unauthorized');
    return this.eventRegistrationsService.register(+id, user.sub);
  }

  @Delete(':id/register')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unregister current user from an event' })
  @ApiOkResponse({ description: 'Registration removed' })
  @ApiNotFoundResponse({ description: 'Registration not found', type: HttpExceptionDto })
  unregister(@Param('id') id: string, @Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException('Unauthorized');
    return this.eventRegistrationsService.unregister(+id, user.sub);
  }

  @Get(':id/registration-status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if current user is registered for an event' })
  @ApiOkResponse({ description: 'Registration status' })
  registrationStatus(@Param('id') id: string, @Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException('Unauthorized');
    return this.eventRegistrationsService.isRegistered(+id, user.sub);
  }

  @Get(':id/registrations')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('events.manage', 'events.registrations.view')
  @ApiOperation({ summary: 'Get all registrations for an event (Admin only)' })
  @ApiOkResponse({ description: 'List of registrations' })
  @ApiNotFoundResponse({ description: 'Event not found', type: HttpExceptionDto })
  getRegistrations(@Param('id') id: string) {
    return this.eventRegistrationsService.getRegistrations(+id);
  }
}
