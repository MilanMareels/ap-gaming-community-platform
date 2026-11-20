import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EsportsResultsService } from './esports-results.service.js';
import { CreateEsportsMatchDto, EsportsMatchQueryDto, UpdateEsportsMatchDto } from '../../dtos/esports-results/esports-match.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { PrismaModel } from '../../_gen/prisma-class/index.js';

@ApiTags('Esports results')
@Controller('esports-results')
export class EsportsResultsController {
  constructor(private readonly esportsResults: EsportsResultsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Match results and upcoming matches of the esports teams, newest first (public)' })
  @ApiOkResponse({ type: [PrismaModel.EsportsMatch] })
  findAll(@Query() query: EsportsMatchQueryDto) {
    return this.esportsResults.findAll(query.gameId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('esports.results.manage')
  @ApiOperation({ summary: 'Add a match' })
  @ApiCreatedResponse({ type: PrismaModel.EsportsMatch })
  create(@Body() dto: CreateEsportsMatchDto) {
    return this.esportsResults.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('esports.results.manage')
  @ApiOperation({ summary: 'Edit a match' })
  @ApiOkResponse({ type: PrismaModel.EsportsMatch })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEsportsMatchDto) {
    return this.esportsResults.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('esports.results.manage')
  @ApiOperation({ summary: 'Delete a match' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.esportsResults.remove(id);
  }
}
