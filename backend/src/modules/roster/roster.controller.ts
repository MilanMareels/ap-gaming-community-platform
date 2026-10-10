import { Controller, Get, Post, Patch, Body, Delete, Param, UseGuards, BadRequestException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiConsumes } from '@nestjs/swagger';
import { RosterService } from './roster.service.js';
import { CreateRosterEntryDto, CreateRosterGameDto, UpdateRosterEntryDto } from '../../dtos/roster/roster.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { PrismaModel } from '../../_gen/prisma-class/index.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

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

  @Public()
  @Get('entries')
  @ApiOperation({ summary: 'Get all roster entries' })
  @ApiOkResponse({ type: [PrismaModel.RosterEntry] })
  findAllEntries() {
    return this.rosterService.findAllEntries();
  }

  @Post('entries')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('roster.manage')
  @ApiOperation({ summary: 'Add a roster entry with optional image (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ type: PrismaModel.RosterEntry })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/rosters',
        filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, `roster-${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(null, false); // Mischien error gooien of??
        }
        cb(null, true);
      },
    }),
  )
  createEntry(@Body() dto: CreateRosterEntryDto, @UploadedFile() file?: any) {
    const imagePath = file ? `uploads/rosters/${file.filename}` : null;
    return this.rosterService.createEntry(dto, imagePath);
  }

  @Patch('entries/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('roster.manage')
  @ApiOperation({ summary: 'Update a roster entry with optional image (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: PrismaModel.RosterEntry })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/rosters',
        filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, `roster-${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(null, false);
        }
        cb(null, true);
      },
    }),
  )
  updateEntry(@Param('id') id: string, @Body() dto: UpdateRosterEntryDto, @UploadedFile() file?: any) {
    const imagePath = file ? `uploads/rosters/${file.filename}` : undefined;
    return this.rosterService.updateEntry(+id, dto, imagePath);
  }

  @Delete('entries/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('roster.manage')
  @ApiOperation({ summary: 'Delete a roster entry (Admin only)' })
  deleteEntry(@Param('id') id: string) {
    return this.rosterService.deleteEntry(+id);
  }
}
