import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import {
  AdminCreateReservationDto,
  CreateReservationDto,
  ReservationStatus,
  UpdateReservationDto,
  UpdateReservationStatusDto,
} from '../../dtos/reservations/reservation.dto.js';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private formatDateTimeDutch(date: Date): string {
    return new Intl.DateTimeFormat('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(date);
  }

  private capitalizeInventory(inventory: string): string {
    const mapping: Record<string, string> = {
      pc: 'PC',
      ps5: 'PlayStation 5',
      switch: 'Nintendo Switch',
    };
    return mapping[inventory.toLowerCase()] || inventory;
  }

  private async sendConfirmationEmail(
    email: string,
    sNumber: string,
    reservationCuid: string,
    inventory: string,
    controllers: number,
    startTime: Date,
    endTime: Date,
  ): Promise<void> {
    try {
      const qrCodeBuffer =
        await this.mailService.generateQRCode(reservationCuid);

      await this.mailService.sendMailWithAttachments(
        email,
        'Reservatie Bevestiging - AP Gaming Hub',
        'reservation/confirmation',
        {
          sNumber,
          reservationId: reservationCuid,
          inventory: this.capitalizeInventory(inventory),
          controllers,
          startTime: this.formatDateTimeDutch(startTime),
          endTime: this.formatDateTimeDutch(endTime),
          email,
        },
        [
          {
            filename: 'qrcode.png',
            content: qrCodeBuffer,
            cid: 'qrcode',
          },
        ],
      );
    } catch (error) {
      // Log error but don't fail the reservation creation
      console.error('Failed to send confirmation email:', error);
    }
  }

  async create(dto: CreateReservationDto) {
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 3);
    maxDate.setHours(23, 59, 59, 999);
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime < now) {
      throw new BadRequestException('Cannot reserve in the past');
    }
    if (startTime > maxDate) {
      throw new BadRequestException(
        'Reservations can only be made up to 3 days in advance',
      );
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
      throw new BadRequestException(
        `Hardware type '${dto.inventory}' is not configured in settings.`,
      );
    }

    const maxCapacity = parseInt(settingRecord.value, 10);

    if (isNaN(maxCapacity)) {
      throw new BadRequestException(
        `Configuration error: capacity for '${dto.inventory}' is not a valid number.`,
      );
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
      throw new BadRequestException(
        `All ${dto.inventory}s are already reserved for this time slot`,
      );
    }

    const reservation = await this.prisma.reservation.create({
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

    // Send confirmation email
    await this.sendConfirmationEmail(
      dto.email,
      dto.sNumber,
      reservation.cuid,
      dto.inventory,
      dto.controllers,
      startTime,
      endTime,
    );

    return reservation;
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

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    const reservation = await this.prisma.reservation.create({
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

    // Send confirmation email
    await this.sendConfirmationEmail(
      dto.email,
      dto.sNumber || 'N/A',
      reservation.cuid,
      dto.inventory,
      dto.controllers,
      startTime,
      endTime,
    );

    return reservation;
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
