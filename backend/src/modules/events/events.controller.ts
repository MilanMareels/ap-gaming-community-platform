import { Controller, Get, Post, Patch, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { EventsService } from './events.service.js';
import { CreateEventDto, UpdateEventDto } from '../../dtos/events/event.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { AdminGuard } from '../../guards/admin.guard.js';
import { Public } from '../auth/public.decorator.js';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get upcoming events (public)' })
  @ApiOkResponse({ type: [CreateEventDto] })
  findUpcoming() {
    return this.eventsService.findUpcoming();
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get all events (Admin only)' })
  @ApiOkResponse({ type: [CreateEventDto] })
  findAll() {
    return this.eventsService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Create a new event (Admin only)' })
  @ApiCreatedResponse({ type: CreateEventDto })
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Update an event (Admin only)' })
  @ApiOkResponse({ type: CreateEventDto })
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Delete an event (Admin only)' })
  delete(@Param('id') id: string) {
    return this.eventsService.delete(+id);
  }
}
