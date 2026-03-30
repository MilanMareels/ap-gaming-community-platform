import { Controller, Get, Post, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { RosterService } from './roster.service.js';
import { CreateRosterEntryDto, CreateRosterGameDto } from '../../dtos/roster/roster.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { AdminGuard } from '../../guards/admin.guard.js';
import { Public } from '../auth/public.decorator.js';
import { PrismaModel } from '../../_gen/prisma-class/index.js';

@ApiTags('Roster')
@Controller('roster')
export class RosterController {
  constructor(private readonly rosterService: RosterService) {}

  @Public()
  @Get('games')
  @ApiOperation({ summary: 'Get all roster games with entries' })
  @ApiOkResponse({ type: [PrismaModel.RosterGame] })
  findAllGames() {
    return this.rosterService.findAllGames();
  }

  @Post('games')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Create a new roster game (Admin only)' })
  @ApiCreatedResponse({ type: PrismaModel.RosterGame })
  createGame(@Body() dto: CreateRosterGameDto) {
    return this.rosterService.createGame(dto.name);
  }

  @Delete('games/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Delete a roster game (Admin only)' })
  deleteGame(@Param('id') id: string) {
    return this.rosterService.deleteGame(+id);
  }

  @Public()
  @Get('entries')
  @ApiOperation({ summary: 'Get all roster entries' })
  @ApiOkResponse({ type: [PrismaModel.RosterEntry] })
  findAllEntries() {
    return this.rosterService.findAllEntries();
  }

  @Post('entries')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Add a roster entry (Admin only)' })
  @ApiCreatedResponse({ type: PrismaModel.RosterEntry })
  createEntry(@Body() dto: CreateRosterEntryDto) {
    return this.rosterService.createEntry(dto);
  }

  @Delete('entries/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Delete a roster entry (Admin only)' })
  deleteEntry(@Param('id') id: string) {
    return this.rosterService.deleteEntry(+id);
  }
}
