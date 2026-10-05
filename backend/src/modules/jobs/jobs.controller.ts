import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JobsService } from './jobs.service.js';
import { CreateJobDto, UpdateJobDto } from '../../dtos/jobs/job.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { Public } from '../auth/public.decorator.js';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active jobs (public)' })
  findActive() {
    return this.jobsService.findActive();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('jobs.manage')
  @ApiOperation({ summary: 'List all jobs (Admin only)' })
  findAll() {
    return this.jobsService.findAll();
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('jobs.manage')
  @ApiOperation({ summary: 'Get a job by ID (Admin only)' })
  findByIdAdmin(@Param('id') id: string) {
    return this.jobsService.findById(+id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single active job (public)' })
  findById(@Param('id') id: string) {
    return this.jobsService.findActiveById(+id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('jobs.manage')
  @ApiOperation({ summary: 'Create a job (Admin only)' })
  create(@Body() dto: CreateJobDto) {
    return this.jobsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('jobs.manage')
  @ApiOperation({ summary: 'Update a job (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.jobsService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('jobs.manage')
  @ApiOperation({ summary: 'Delete a job (Admin only)' })
  delete(@Param('id') id: string) {
    return this.jobsService.delete(+id);
  }
}
