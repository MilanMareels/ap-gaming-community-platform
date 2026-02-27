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
  ReservationQueryDto,
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

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Delete a reservation (Admin only)' })
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(+id);
  }
}
