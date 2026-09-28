import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { InventoryAdjustmentsService } from './inventory-adjustments.service.js';
import {
  CreateInventoryAdjustmentDto,
  UpdateInventoryAdjustmentDto,
  InventoryAdjustmentQueryDto,
} from '../../dtos/inventory-adjustments/inventory-adjustment.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { PrismaModel } from '../../_gen/prisma-class/index.js';
import { HttpExceptionDto } from '../../dtos/http-exception.dto.js';

@ApiTags('Inventory Adjustments')
@Controller('inventory-adjustments')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermissions('inventory-adjustments.manage')
export class InventoryAdjustmentsController {
  constructor(private readonly service: InventoryAdjustmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an inventory adjustment (Admin only)' })
  @ApiCreatedResponse({ type: PrismaModel.InventoryAdjustment })
  @ApiBadRequestResponse({ description: 'Validation error', type: HttpExceptionDto })
  create(@Body() dto: CreateInventoryAdjustmentDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List inventory adjustments (Admin only)' })
  @ApiOkResponse({ type: [PrismaModel.InventoryAdjustment] })
  findAll(@Query() query: InventoryAdjustmentQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single inventory adjustment (Admin only)' })
  @ApiOkResponse({ type: PrismaModel.InventoryAdjustment })
  @ApiNotFoundResponse({ description: 'Inventory adjustment not found', type: HttpExceptionDto })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an inventory adjustment (Admin only)' })
  @ApiOkResponse({ type: PrismaModel.InventoryAdjustment })
  @ApiNotFoundResponse({ description: 'Inventory adjustment not found', type: HttpExceptionDto })
  @ApiBadRequestResponse({ description: 'Validation error', type: HttpExceptionDto })
  update(@Param('id') id: string, @Body() dto: UpdateInventoryAdjustmentDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an inventory adjustment (Admin only)' })
  @ApiNotFoundResponse({ description: 'Inventory adjustment not found', type: HttpExceptionDto })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
