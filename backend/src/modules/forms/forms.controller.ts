import { Controller, Get, Put, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';
import { FormsService } from './forms.service.js';
import { CreateFormDto, UpdateFormDto } from '../../dtos/forms/form.dto.js';
import { CreateFormFieldDto, UpdateFormFieldDto, ReorderFormFieldsDto } from '../../dtos/forms/form-field.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { RbacService } from '../rbac/rbac.service.js';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

class SetFormAccessDto {
  @ApiProperty({ example: [1, 2], type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  roleIds!: number[];
}

@ApiTags('Forms')
@Controller('forms')
export class FormsController {
  constructor(
    private readonly formsService: FormsService,
    private readonly rbacService: RbacService,
  ) {}

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

  @Get('admin/accessible')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage', 'forms.submissions.view')
  @ApiOperation({ summary: 'List forms the user has access to' })
  async findAccessible(@Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user!;
    const permissions = user.impersonatingRoleId
      ? new Set(user.permissions ?? [])
      : await this.rbacService.getPermissionsForUser(user.sub);
    if (permissions.has('forms.manage')) {
      return this.formsService.findAll();
    }
    return this.formsService.findAccessible(user.sub);
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

  // --- Access management ---

  @Get(':id/access')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage')
  @ApiOperation({ summary: 'Get roles with access to this form' })
  getFormAccess(@Param('id') id: string) {
    return this.formsService.getFormAccess(+id);
  }

  @Put(':id/access')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage')
  @ApiOperation({ summary: 'Set which roles can view this form\'s submissions' })
  setFormAccess(@Param('id') id: string, @Body() dto: SetFormAccessDto) {
    return this.formsService.setFormAccess(+id, dto.roleIds);
  }

  // --- Public endpoint ---

  @Public()
  @Get('public/:cuid')
  @ApiOperation({ summary: 'Get form for public rendering' })
  findPublic(@Param('cuid') cuid: string) {
    return this.formsService.findByCuid(cuid);
  }
}
