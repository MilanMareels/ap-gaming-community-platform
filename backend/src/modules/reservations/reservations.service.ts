import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateReservationDto,
  ReservationStatus,
  UpdateReservationStatusDto,
} from '../../dtos/reservations/reservation.dto.js';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReservationDto) {
    // Validate date is not more than 3 days ahead
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 3);
    maxDate.setHours(23, 59, 59, 999);
    const startTime = new Date(dto.startTime);

    if (startTime < now) {
      throw new BadRequestException('Cannot reserve in the past');
    }
    if (startTime > maxDate) {
      throw new BadRequestException(
        'Reservations can only be made up to 3 days in advance',
      );
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          sNumber: dto.sNumber,
        },
      });
    }

    // Check for conflicts
    const conflictingReservation = await this.prisma.reservation.findFirst({
      where: {
        inventory: dto.inventory,
        status: ReservationStatus.RESERVED,
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(dto.startTime) } },
              { endTime: { gt: new Date(dto.startTime) } },
            ],
          },
          {
            AND: [
              { startTime: { lt: new Date(dto.endTime) } },
              { endTime: { gte: new Date(dto.endTime) } },
            ],
          },
        ],
      },
    });

    if (conflictingReservation) {
      throw new BadRequestException('This time slot is already reserved');
    }

    return this.prisma.reservation.create({
      data: {
        userId: user.id,
        inventory: dto.inventory,
        controllers: dto.controllers,
        email: dto.email,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        status: ReservationStatus.RESERVED,
      },
      include: {
        user: true,
      },
    });
  }

  async findAll(date?: string, search?: string) {
    const where: any = {};

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { user: { sNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.reservation.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    });
  }

  async updateStatus(id: number, dto: UpdateReservationStatusDto) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return this.prisma.reservation.update({
      where: { id },
      data: { status: dto.status },
      include: { user: true },
    });
  }

  async remove(id: number) {
    await this.prisma.reservation.delete({ where: { id } });
  }

  async getNoShows() {
    return this.prisma.reservation.findMany({
      where: {
        status: ReservationStatus.NO_SHOW,
      },
      include: {
        user: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    });
  }
}
