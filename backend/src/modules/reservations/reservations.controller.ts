import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { ReservationsService } from './reservations.service.js';
import { InventoryAdjustmentsService } from '../inventory-adjustments/inventory-adjustments.service.js';
import {
  CreateReservationDto,
  AdminCreateReservationDto,
  ReservationQueryDto,
  ReservationSlotDto,
  ReservationVerificationDto,
  UpdateReservationDto,
  UpdateReservationStatusDto,
} from '../../dtos/reservations/reservation.dto.js';
import { InventoryAdjustmentSlotDto } from '../../dtos/inventory-adjustments/inventory-adjustment.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { Public } from '../auth/public.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { PrismaModel } from '../../_gen/prisma-class/index.js';
import { HttpExceptionDto } from '../../dtos/http-exception.dto.js';

@ApiTags('Reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly inventoryAdjustmentsService: InventoryAdjustmentsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new reservation (authenticated user)' })
  @ApiCreatedResponse({ type: PrismaModel.Reservation })
  @ApiBadRequestResponse({ description: 'Validation or business rule violation', type: HttpExceptionDto })
  create(@Body() dto: CreateReservationDto, @Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException('Unauthorized');
    return this.reservationsService.createForUser(user.sub, dto);
  }

  @Public()
  @Patch('cancel/:cuid')
  @ApiOperation({ summary: 'Cancel a reservation using the unique CUID from email' })
  @ApiOkResponse({ type: PrismaModel.Reservation })
  @ApiNotFoundResponse({ description: 'Reservation not found', type: HttpExceptionDto })
  @ApiBadRequestResponse({ description: 'Reservation is already cancelled or has already started', type: HttpExceptionDto })
  cancelByCuid(@Param('cuid') cuid: string) {
    return this.reservationsService.cancelByCuid(cuid);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('reservations.manage')
  @ApiOperation({ summary: 'Get all reservations (Admin only)' })
  @ApiOkResponse({ type: [PrismaModel.Reservation] })
  findAll(@Query() query: ReservationQueryDto) {
    return this.reservationsService.findAll(query.date, query.search);
  }

  @Public()
  @Get('slots')
  @ApiOperation({
    summary: 'Get occupied time slots for a date (public, no PII)',
  })
  @ApiOkResponse({ type: [ReservationSlotDto] })
  getSlots(@Query('date') date: string) {
    return this.reservationsService.getSlots(date);
  }

  @Public()
  @Get('adjustments')
  @ApiOperation({
    summary: 'Get active inventory adjustments for a date (public, for availability calculation)',
  })
  @ApiOkResponse({ type: [InventoryAdjustmentSlotDto] })
  getAdjustments(@Query('date') date: string) {
    return this.inventoryAdjustmentsService.getAdjustmentsForDate(date);
  }

  @Get('verify/:cuid')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('reservations.manage')
  @ApiOperation({
    summary: 'Verify reservation by QR code CUID (Admin only)',
  })
  @ApiOkResponse({ type: ReservationVerificationDto })
  @ApiNotFoundResponse({ description: 'Reservation not found', type: HttpExceptionDto })
  verifyByCuid(@Param('cuid') cuid: string) {
    return this.reservationsService.verifyByCuid(cuid);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('reservations.manage')
  @ApiOperation({
    summary: 'Create a reservation as admin (no date restrictions)',
  })
  @ApiCreatedResponse({ type: PrismaModel.Reservation })
  @ApiBadRequestResponse({ description: 'Time slot is already reserved', type: HttpExceptionDto })
  adminCreate(@Body() dto: AdminCreateReservationDto) {
    return this.reservationsService.adminCreate(dto);
  }

  @Get('no-shows')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('reservations.noshows.manage', 'reservations.manage')
  @ApiOperation({ summary: 'Get all no-shows (Admin only)' })
  @ApiOkResponse({ type: [PrismaModel.Reservation] })
  getNoShows() {
    return this.reservationsService.getNoShows();
  }

  @Patch(':userId/no-show')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('reservations.noshows.manage', 'reservations.manage')
  @ApiOperation({ summary: 'Unblock user from reservations (Admin only)' })
  @ApiOkResponse({ type: PrismaModel.Reservation })
  @ApiNotFoundResponse({ description: 'No no-shows found for this user', type: HttpExceptionDto })
  unBlockUser(@Param('userId') userId: string) {
    return this.reservationsService.unBlockUser(+userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('reservations.manage')
  @ApiOperation({ summary: 'Update reservation status (Admin only)' })
  @ApiOkResponse({ type: PrismaModel.Reservation })
  @ApiNotFoundResponse({ description: 'Reservation not found', type: HttpExceptionDto })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateReservationStatusDto) {
    return this.reservationsService.updateStatus(+id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('reservations.manage')
  @ApiOperation({ summary: 'Update a reservation (Admin only)' })
  @ApiOkResponse({ type: PrismaModel.Reservation })
  @ApiNotFoundResponse({ description: 'Reservation not found', type: HttpExceptionDto })
  update(@Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.reservationsService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('reservations.manage')
  @ApiOperation({ summary: 'Delete a reservation (Admin only)' })
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(+id);
  }
}
