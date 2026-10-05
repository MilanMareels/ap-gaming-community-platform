import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { FormsService } from './forms.service.js';
import { CreateFormDto, UpdateFormDto } from '../../dtos/forms/form.dto.js';
import { CreateFormFieldDto, UpdateFormFieldDto, ReorderFormFieldsDto } from '../../dtos/forms/form-field.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { Public } from '../auth/public.decorator.js';

@ApiTags('Forms')
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get('admin')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage')
  @ApiOperation({ summary: 'List all forms (Admin only)' })
  findAll() {
    return this.formsService.findAll();
  }

  @Get('admin/simple')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage', 'jobs.manage')
  @ApiOperation({ summary: 'List active forms as simple list for selectors' })
  findAllSimple() {
    return this.formsService.findAllSimple();
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage')
  @ApiOperation({ summary: 'Get form with fields (Admin only)' })
  findById(@Param('id') id: string) {
    return this.formsService.findById(+id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage')
  @ApiOperation({ summary: 'Create a new form (Admin only)' })
  create(@Body() dto: CreateFormDto) {
    return this.formsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage')
  @ApiOperation({ summary: 'Update a form (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateFormDto) {
    return this.formsService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage')
  @ApiOperation({ summary: 'Delete a form (Admin only)' })
  delete(@Param('id') id: string) {
    return this.formsService.delete(+id);
  }

  // --- Field endpoints ---

  @Post(':id/fields')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage')
  @ApiOperation({ summary: 'Add a field to a form (Admin only)' })
  createField(@Param('id') id: string, @Body() dto: CreateFormFieldDto) {
    return this.formsService.createField(+id, dto);
  }

  @Patch(':id/fields/reorder')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage')
  @ApiOperation({ summary: 'Reorder form fields (Admin only)' })
  reorderFields(@Param('id') id: string, @Body() dto: ReorderFormFieldsDto) {
    return this.formsService.reorderFields(+id, dto);
  }

  @Patch(':id/fields/:fieldId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage')
  @ApiOperation({ summary: 'Update a form field (Admin only)' })
  updateField(@Param('id') id: string, @Param('fieldId') fieldId: string, @Body() dto: UpdateFormFieldDto) {
    return this.formsService.updateField(+id, +fieldId, dto);
  }

  @Delete(':id/fields/:fieldId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage')
  @ApiOperation({ summary: 'Delete a form field (Admin only)' })
  deleteField(@Param('id') id: string, @Param('fieldId') fieldId: string) {
    return this.formsService.deleteField(+id, +fieldId);
  }

  // --- Public endpoint ---

  @Public()
  @Get('public/:cuid')
  @ApiOperation({ summary: 'Get form for public rendering' })
  findPublic(@Param('cuid') cuid: string) {
    return this.formsService.findByCuid(cuid);
  }
}
