import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AdminCreateReservationDto,
  CreateReservationDto,
  ReservationStatus,
  UpdateReservationDto,
  UpdateReservationStatusDto,
} from '../../dtos/reservations/reservation.dto.js';
import { errorMessages } from '../../errors/errorMessages.js';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReservationDto) {
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 3);
    maxDate.setHours(23, 59, 59, 999);
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime < now) {
      throw new BadRequestException(errorMessages.pastDate);
    }
    if (startTime > maxDate) {
      throw new BadRequestException(errorMessages.maxAdvanceDays);
    }

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

    const hardwareKey = dto.inventory.toLowerCase();

    const settingRecord = await this.prisma.setting.findFirst({
      where: { key: hardwareKey },
    });

    if (!settingRecord) {
      throw new BadRequestException(`Hardware type '${dto.inventory}' is not configured in settings.`);
    }

    const maxCapacity = parseInt(settingRecord.value, 10);

    if (isNaN(maxCapacity)) {
      throw new BadRequestException(`Configuration error: capacity for '${dto.inventory}' is not a valid number.`);
    }

    const conflictingReservationsCount = await this.prisma.reservation.count({
      where: {
        inventory: dto.inventory,
        status: { in: [ReservationStatus.RESERVED, ReservationStatus.PRESENT] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (conflictingReservationsCount >= maxCapacity) {
      throw new BadRequestException(`All ${dto.inventory}s are already reserved for this time slot`);
    }

    const noShowCount = await this.prisma.reservation.count({
      where: {
        userId: user.id,
        status: ReservationStatus.NO_SHOW,
      },
    });

    if (noShowCount >= 3) {
      throw new BadRequestException('You already have three no-shows. You can no longer make new reservations.');
    }

    const existingReservation = await this.prisma.reservation.findFirst({
      where: {
        userId: user.id,
        status: { in: [ReservationStatus.RESERVED, ReservationStatus.PRESENT] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (existingReservation) {
      throw new BadRequestException('You already have a reservation that overlaps with this time slot');
    }

    const bufferTime = 30 * 60 * 1000; // 30 minutes
    const bufferStart = new Date(startTime.getTime() - bufferTime);
    const bufferEnd = new Date(endTime.getTime() + bufferTime);

    const bufferConflict = await this.prisma.reservation.findFirst({
      where: {
        userId: user.id,
        status: { in: [ReservationStatus.RESERVED, ReservationStatus.PRESENT] },
        OR: [
          {
            AND: [{ startTime: { lte: bufferStart } }, { endTime: { gt: bufferStart } }],
          },
          {
            AND: [{ startTime: { lt: bufferEnd } }, { endTime: { gte: bufferEnd } }],
          },
        ],
      },
    });

    if (bufferConflict) {
      throw new BadRequestException('You must have at least 30 minutes between reservations');
    }
    const maxReservationsPerDay = 2;
    const startOfDay = new Date(startTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startTime);
    endOfDay.setHours(23, 59, 59, 999);

    const dailyReservationsCount = await this.prisma.reservation.count({
      where: {
        userId: user.id,
        status: { in: [ReservationStatus.RESERVED, ReservationStatus.PRESENT] },
        startTime: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (dailyReservationsCount >= maxReservationsPerDay) {
      throw new BadRequestException('You can only make two reservations per day');
    }

    return this.prisma.reservation.create({
      data: {
        userId: user.id,
        inventory: dto.inventory,
        controllers: dto.controllers,
        email: dto.email,
        startTime: startTime,
        endTime: endTime,
        status: ReservationStatus.RESERVED,
      },
      include: {
        user: true,
      },
    });
  }

  async adminCreate(dto: AdminCreateReservationDto) {
    // Find or create user (sNumber defaults to 'N/A' for anonymous)
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          sNumber: dto.sNumber || 'N/A',
        },
      });
    }

    // Check for conflicts
    const conflictingReservation = await this.prisma.reservation.findFirst({
      where: {
        inventory: dto.inventory,
        status: { in: [ReservationStatus.RESERVED, ReservationStatus.PRESENT] },
        OR: [
          {
            AND: [{ startTime: { lte: new Date(dto.startTime) } }, { endTime: { gt: new Date(dto.startTime) } }],
          },
          {
            AND: [{ startTime: { lt: new Date(dto.endTime) } }, { endTime: { gte: new Date(dto.endTime) } }],
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

  async update(id: number, dto: UpdateReservationDto) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // If email or sNumber changed, update or create the user
    if (dto.email || dto.sNumber) {
      const newEmail = dto.email || reservation.email;
      const newSNumber = dto.sNumber || reservation.user.sNumber;

      if (newEmail !== reservation.email) {
        // Find or create user with new email
        let user = await this.prisma.user.findUnique({
          where: { email: newEmail },
        });

        if (!user) {
          user = await this.prisma.user.create({
            data: { email: newEmail, sNumber: newSNumber },
          });
        }

        await this.prisma.reservation.update({
          where: { id },
          data: { userId: user.id, email: newEmail },
        });
      } else if (dto.sNumber) {
        await this.prisma.user.update({
          where: { id: reservation.userId },
          data: { sNumber: newSNumber },
        });
      }
    }

    // Build update data for reservation fields
    const updateData: any = {};
    if (dto.email) updateData.email = dto.email;
    if (dto.inventory) updateData.inventory = dto.inventory;
    if (dto.controllers !== undefined) updateData.controllers = dto.controllers;
    if (dto.startTime) updateData.startTime = new Date(dto.startTime);
    if (dto.endTime) updateData.endTime = new Date(dto.endTime);

    return this.prisma.reservation.update({
      where: { id },
      data: updateData,
      include: { user: true },
    });
  }

  async getSlots(date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: { in: [ReservationStatus.RESERVED, ReservationStatus.PRESENT] },
        startTime: { gte: startOfDay, lte: endOfDay },
      },
      select: {
        inventory: true,
        startTime: true,
        endTime: true,
        controllers: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return reservations;
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
      where.OR = [{ email: { contains: search, mode: 'insensitive' } }, { user: { sNumber: { contains: search, mode: 'insensitive' } } }];
    }

    return this.prisma.reservation.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: {
        startTime: 'asc',
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

  async unBlockUser(userId: number) {
    const noShowReservations = await this.prisma.reservation.findMany({
      where: {
        userId,
        status: ReservationStatus.NO_SHOW,
      },
    });

    if (noShowReservations.length === 0) {
      throw new NotFoundException('No no-shows found for this user');
    }

    for (const reservation of noShowReservations) {
      await this.prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.CANCELLED }, // Andere status nodig voor deblock??
      });
    }
  }
}
