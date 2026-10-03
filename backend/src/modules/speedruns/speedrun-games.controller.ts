import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse,
  ApiNotFoundResponse, ApiBadRequestResponse, ApiConsumes,
} from '@nestjs/swagger';
import { SpeedrunGamesService } from './speedrun-games.service.js';
import { CreateSpeedrunGameDto, UpdateSpeedrunGameDto } from '../../dtos/speedruns/speedrun-game.dto.js';
import { CreateSpeedrunCategoryDto, UpdateSpeedrunCategoryDto, ReorderSpeedrunCategoriesDto } from '../../dtos/speedruns/speedrun-category.dto.js';
import { CreateSpeedrunLevelDto, UpdateSpeedrunLevelDto, ReorderSpeedrunLevelsDto } from '../../dtos/speedruns/speedrun-level.dto.js';
import { CreateSpeedrunVariableDto, UpdateSpeedrunVariableDto } from '../../dtos/speedruns/speedrun-variable.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { HttpExceptionDto } from '../../dtos/http-exception.dto.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

@ApiTags('Speedruns - Games')
@Controller('speedruns/games')
export class SpeedrunGamesController {
  constructor(private readonly gamesService: SpeedrunGamesService) {}

  // ── Public ──

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all speedrun games (public)' })
  findAll() {
    return this.gamesService.findAll();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get a speedrun game by slug (public)' })
  @ApiNotFoundResponse({ description: 'Game not found', type: HttpExceptionDto })
  findBySlug(@Param('slug') slug: string) {
    // If slug is numeric, treat as ID lookup (for admin)
    if (/^\d+$/.test(slug)) {
      return this.gamesService.findById(+slug);
    }
    return this.gamesService.findBySlug(slug);
  }

  // ── Admin: Games ──

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.manage')
  @ApiOperation({ summary: 'Create a speedrun game (Admin)' })
  @ApiCreatedResponse()
  @ApiBadRequestResponse({ type: HttpExceptionDto })
  createGame(@Body() dto: CreateSpeedrunGameDto) {
    return this.gamesService.createGame(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.manage')
  @ApiOperation({ summary: 'Update a speedrun game (Admin)' })
  @ApiNotFoundResponse({ type: HttpExceptionDto })
  updateGame(@Param('id') id: string, @Body() dto: UpdateSpeedrunGameDto) {
    return this.gamesService.updateGame(+id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.manage')
  @ApiOperation({ summary: 'Delete a speedrun game (Admin)' })
  @ApiNotFoundResponse({ type: HttpExceptionDto })
  deleteGame(@Param('id') id: string) {
    return this.gamesService.deleteGame(+id);
  }

  @Post(':id/cover')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.manage')
  @ApiOperation({ summary: 'Upload cover image for a speedrun game (Admin)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/speedruns',
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, `game-${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(null, false);
        }
        cb(null, true);
      },
    }),
  )
  uploadCover(@Param('id') id: string, @UploadedFile() file?: any) {
    if (!file) throw new Error('No valid image file provided');
    const imagePath = `uploads/speedruns/${file.filename}`;
    return this.gamesService.updateGameCoverImage(+id, imagePath);
  }

  // ── Admin: Categories (static routes before :id) ──

  @Post(':gameId/categories')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.manage')
  @ApiOperation({ summary: 'Create a category for a game (Admin)' })
  @ApiCreatedResponse()
  createCategory(@Param('gameId') gameId: string, @Body() dto: CreateSpeedrunCategoryDto) {
    return this.gamesService.createCategory(+gameId, dto);
  }

  @Patch(':gameId/categories/reorder')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.manage')
  @ApiOperation({ summary: 'Reorder categories (Admin)' })
  reorderCategories(@Param('gameId') gameId: string, @Body() dto: ReorderSpeedrunCategoriesDto) {
    return this.gamesService.reorderCategories(+gameId, dto.items);
  }

  @Patch(':gameId/categories/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.manage')
  @ApiOperation({ summary: 'Update a category (Admin)' })
  updateCategory(
    @Param('gameId') gameId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSpeedrunCategoryDto,
  ) {
    return this.gamesService.updateCategory(+gameId, +id, dto);
  }

  @Delete(':gameId/categories/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.manage')
  @ApiOperation({ summary: 'Delete a category (Admin)' })
  deleteCategory(@Param('gameId') gameId: string, @Param('id') id: string) {
    return this.gamesService.deleteCategory(+gameId, +id);
  }

  // ── Admin: Levels ──

  @Post(':gameId/levels')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.manage')
  @ApiOperation({ summary: 'Create a level for a game (Admin)' })
  @ApiCreatedResponse()
  createLevel(@Param('gameId') gameId: string, @Body() dto: CreateSpeedrunLevelDto) {
    return this.gamesService.createLevel(+gameId, dto);
  }

  @Patch(':gameId/levels/reorder')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.manage')
  @ApiOperation({ summary: 'Reorder levels (Admin)' })
  reorderLevels(@Param('gameId') gameId: string, @Body() dto: ReorderSpeedrunLevelsDto) {
    return this.gamesService.reorderLevels(+gameId, dto.items);
  }

  @Patch(':gameId/levels/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.manage')
  @ApiOperation({ summary: 'Update a level (Admin)' })
  updateLevel(
    @Param('gameId') gameId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSpeedrunLevelDto,
  ) {
    return this.gamesService.updateLevel(+gameId, +id, dto);
  }

  @Delete(':gameId/levels/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.manage')
  @ApiOperation({ summary: 'Delete a level (Admin)' })
  deleteLevel(@Param('gameId') gameId: string, @Param('id') id: string) {
    return this.gamesService.deleteLevel(+gameId, +id);
  }

  // ── Admin: Variables ──

  @Post(':gameId/variables')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.manage')
  @ApiOperation({ summary: 'Create a variable for a game (Admin)' })
  @ApiCreatedResponse()
  createVariable(@Param('gameId') gameId: string, @Body() dto: CreateSpeedrunVariableDto) {
    return this.gamesService.createVariable(+gameId, dto);
  }

  @Patch(':gameId/variables/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.manage')
  @ApiOperation({ summary: 'Update a variable (Admin)' })
  updateVariable(
    @Param('gameId') gameId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSpeedrunVariableDto,
  ) {
    return this.gamesService.updateVariable(+gameId, +id, dto);
  }

  @Delete(':gameId/variables/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('speedruns.manage')
  @ApiOperation({ summary: 'Delete a variable (Admin)' })
  deleteVariable(@Param('gameId') gameId: string, @Param('id') id: string) {
    return this.gamesService.deleteVariable(+gameId, +id);
  }
}
