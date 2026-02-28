import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { ReservationsService } from './reservations.service.js';
import {
  CreateReservationDto,
  AdminCreateReservationDto,
  ReservationQueryDto,
  ReservationSlotDto,
  UpdateReservationDto,
  UpdateReservationStatusDto,
} from '../../dtos/reservations/reservation.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { AdminGuard } from '../../guards/admin.guard.js';
import { Public } from '../auth/public.decorator.js';
import { PrismaModel } from '../../_gen/prisma-class/index.js';

@ApiTags('Reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new reservation' })
  @ApiCreatedResponse({ type: PrismaModel.Reservation })
  create(@Body() dto: CreateReservationDto) {
    return this.reservationsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
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

  @Post('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: 'Create a reservation as admin (no date restrictions)',
  })
  @ApiCreatedResponse({ type: PrismaModel.Reservation })
  adminCreate(@Body() dto: AdminCreateReservationDto) {
    return this.reservationsService.adminCreate(dto);
  }

  @Get('no-shows')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get all no-shows (Admin only)' })
  @ApiOkResponse({ type: [PrismaModel.Reservation] })
  getNoShows() {
    return this.reservationsService.getNoShows();
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Update reservation status (Admin only)' })
  @ApiOkResponse({ type: PrismaModel.Reservation })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReservationStatusDto,
  ) {
    return this.reservationsService.updateStatus(+id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Update a reservation (Admin only)' })
  @ApiOkResponse({ type: PrismaModel.Reservation })
  update(@Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.reservationsService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Delete a reservation (Admin only)' })
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(+id);
  }
}
