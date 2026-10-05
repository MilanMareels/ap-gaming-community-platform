import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { InventoryAdjustmentsService } from '../inventory-adjustments/inventory-adjustments.service.js';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly inventoryAdjustmentsService: InventoryAdjustmentsService,
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

  private async sendReservationCancelationConfirmationEmail(
    email: string,
    sNumber: string,
    reservationCuid: string,
    inventory: string,
    controllers: number,
    startTime: Date,
    endTime: Date,
  ): Promise<void> {
    try {
      await this.mailService.sendMail(email, 'Annulatie Reservatie Bevestiging - AP Gaming Hub', 'reservation/cancellation', {
        sNumber,
        reservationId: reservationCuid,
        inventory: this.capitalizeInventory(inventory),
        controllers,
        startTime: this.formatDateTimeDutch(startTime),
        endTime: this.formatDateTimeDutch(endTime),
        email,
      });
    } catch (error) {
      // Log error but don't fail the cancellation process
      console.error('Failed to send cancellation email:', error);
    }
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
      const qrCodeBuffer = await this.mailService.generateQRCode(reservationCuid);

      const cancelUrl = `${process.env.FRONTEND_URL}/cancel-reservation/${reservationCuid}`;

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
          cancelUrl,
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

  async createForUser(userId: number, dto: CreateReservationDto) {
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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Authenticated user not found');
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

    const adjustment = await this.inventoryAdjustmentsService.getEffectiveAdjustment(dto.inventory, startTime, endTime);
    const effectiveCapacity = Math.max(0, maxCapacity + adjustment);

    const conflictingReservationsCount = await this.prisma.reservation.count({
      where: {
        inventory: dto.inventory,
        status: { in: [ReservationStatus.RESERVED, ReservationStatus.PRESENT] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (conflictingReservationsCount >= effectiveCapacity) {
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

    const reservation = await this.prisma.reservation.create({
      data: {
        userId: user.id,
        inventory: dto.inventory,
        controllers: dto.controllers,
        email: user.email,
        startTime: startTime,
        endTime: endTime,
        status: ReservationStatus.RESERVED,
      },
      include: {
        user: true,
      },
    });

    // Send confirmation email
    await this.sendConfirmationEmail(user.email, user.sNumber, reservation.cuid, dto.inventory, dto.controllers, startTime, endTime);

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

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    // Check capacity with inventory adjustments
    const hardwareKey = dto.inventory.toLowerCase();
    const settingRecord = await this.prisma.setting.findFirst({
      where: { key: hardwareKey },
    });

    if (settingRecord) {
      const maxCapacity = parseInt(settingRecord.value, 10);
      if (!isNaN(maxCapacity)) {
        const adjustment = await this.inventoryAdjustmentsService.getEffectiveAdjustment(dto.inventory, startTime, endTime);
        const effectiveCapacity = Math.max(0, maxCapacity + adjustment);

        const conflictingCount = await this.prisma.reservation.count({
          where: {
            inventory: dto.inventory,
            status: { in: [ReservationStatus.RESERVED, ReservationStatus.PRESENT] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        if (conflictingCount >= effectiveCapacity) {
          throw new BadRequestException('This time slot is already reserved');
        }
      }
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
    await this.sendConfirmationEmail(dto.email, dto.sNumber || 'N/A', reservation.cuid, dto.inventory, dto.controllers, startTime, endTime);

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

  async verifyByCuid(cuid: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { cuid },
      include: {
        user: {
          select: {
            sNumber: true,
          },
        },
      },
    });

    if (!reservation || [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW].includes(reservation.status as ReservationStatus)) {
      throw new NotFoundException('Reservation not found');
    }

    const verifiedReservation =
      reservation.status === ReservationStatus.RESERVED
        ? await this.prisma.reservation.update({
            where: { id: reservation.id },
            data: { status: ReservationStatus.PRESENT },
            include: {
              user: {
                select: {
                  sNumber: true,
                },
              },
            },
          })
        : reservation;

    return {
      cuid: verifiedReservation.cuid,
      email: verifiedReservation.email,
      sNumber: verifiedReservation.user.sNumber,
      inventory: verifiedReservation.inventory,
      controllers: verifiedReservation.controllers,
      startTime: verifiedReservation.startTime,
      endTime: verifiedReservation.endTime,
      status: verifiedReservation.status,
    };
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

  async getStatistics(from?: string, to?: string) {
    const where: Record<string, unknown> = {};
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) {
        const d = new Date(from);
        d.setUTCHours(0, 0, 0, 0);
        range.gte = d;
      }
      if (to) {
        const d = new Date(to);
        d.setUTCHours(23, 59, 59, 999);
        range.lte = d;
      }
      where.startTime = range;
    }

    const reservations = await this.prisma.reservation.findMany({
      where,
      select: {
        userId: true,
        email: true,
        inventory: true,
        controllers: true,
        startTime: true,
        endTime: true,
        status: true,
        user: { select: { name: true, sNumber: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    // All timestamps in the DB are fake-UTC (local wall-clock stored with Z).
    // We therefore use getUTC* helpers everywhere to read the "local" time.

    const WEEKDAY_LABELS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

    // Helper: YYYY-MM-DD from a fake-UTC Date
    const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
    // Helper: ISO week string YYYY-Www
    const toWeekStr = (d: Date) => {
      const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    // ─── Daily counts ───
    const dailyMap = new Map<string, number>();
    for (const r of reservations) {
      const key = toDateStr(r.startTime);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
    const dailyCounts = [...dailyMap.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

    // ─── Weekday averages ───
    const weekdayTotals = Array.from({ length: 7 }, () => ({ total: 0, days: new Set<string>() }));
    for (const r of reservations) {
      const dow = r.startTime.getUTCDay();
      const ds = toDateStr(r.startTime);
      weekdayTotals[dow].total += 1;
      weekdayTotals[dow].days.add(ds);
    }
    const weekdayAverages = weekdayTotals.map((w, i) => ({
      day: i,
      label: WEEKDAY_LABELS[i],
      avg: w.days.size > 0 ? Math.round((w.total / w.days.size) * 10) / 10 : 0,
    }));

    // ─── Peak hours heatmap ───
    const heatmap = new Map<string, number>();
    for (const r of reservations) {
      const dow = WEEKDAY_LABELS[r.startTime.getUTCDay()];
      const hour = r.startTime.getUTCHours();
      const key = `${dow}|${hour}`;
      heatmap.set(key, (heatmap.get(key) ?? 0) + 1);
    }
    const peakHoursHeatmap = [...heatmap.entries()].map(([key, count]) => {
      const [day, h] = key.split('|');
      return { hour: Number(h), day, count };
    });

    // ─── Hardware breakdown ───
    const hwMap = new Map<string, number>();
    for (const r of reservations) {
      hwMap.set(r.inventory, (hwMap.get(r.inventory) ?? 0) + 1);
    }
    const hardwareBreakdown = [...hwMap.entries()].map(([inventory, count]) => ({ inventory, count }));

    // ─── Hardware over time (weekly) ───
    const hwWeekMap = new Map<string, { pc: number; ps5: number; switch: number }>();
    for (const r of reservations) {
      const week = toWeekStr(r.startTime);
      if (!hwWeekMap.has(week)) hwWeekMap.set(week, { pc: 0, ps5: 0, switch: 0 });
      const entry = hwWeekMap.get(week)!;
      if (r.inventory in entry) entry[r.inventory as keyof typeof entry] += 1;
    }
    const hardwareOverTime = [...hwWeekMap.entries()].map(([week, v]) => ({ week, ...v })).sort((a, b) => a.week.localeCompare(b.week));

    // ─── Average controllers ───
    const totalControllers = reservations.reduce((s, r) => s + r.controllers, 0);
    const avgControllersPerReservation = reservations.length > 0 ? Math.round((totalControllers / reservations.length) * 10) / 10 : 0;

    // ─── Utilization per hardware type ───
    const settings = await this.prisma.setting.findMany({
      where: { key: { in: ['pc', 'ps5', 'switch'] } },
    });
    const capacityMap = new Map(settings.map((s) => [s.key, parseInt(s.value, 10)]));

    // For each hardware type, compute average bookings vs capacity across active time slots
    const utilization = [...capacityMap.entries()].map(([inventory, maxCap]) => {
      const hwReservations = reservations.filter((r) => r.inventory === inventory && r.status !== ReservationStatus.CANCELLED);
      if (hwReservations.length === 0 || maxCap <= 0) {
        return { inventory, utilizationPercent: 0, maxCapacity: maxCap };
      }
      // Group by date and count per time slot
      const dateSlots = new Map<string, Map<string, number>>();
      for (const r of hwReservations) {
        const dateKey = toDateStr(r.startTime);
        if (!dateSlots.has(dateKey)) dateSlots.set(dateKey, new Map());
        const slots = dateSlots.get(dateKey)!;
        const slotKey = `${r.startTime.getUTCHours()}:${String(r.startTime.getUTCMinutes()).padStart(2, '0')}`;
        slots.set(slotKey, (slots.get(slotKey) ?? 0) + 1);
      }
      let totalSlots = 0;
      let totalUtilized = 0;
      for (const slots of dateSlots.values()) {
        for (const count of slots.values()) {
          totalSlots++;
          totalUtilized += count / maxCap;
        }
      }
      const pct = totalSlots > 0 ? Math.round((totalUtilized / totalSlots) * 1000) / 10 : 0;
      return { inventory, utilizationPercent: pct, maxCapacity: maxCap };
    });

    // ─── Status breakdown ───
    const statusMap = new Map<string, number>();
    for (const r of reservations) {
      statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1);
    }
    const total = reservations.length;
    const statusBreakdown = [...statusMap.entries()].map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }));

    // ─── Status over time (weekly show/noshow/cancel rates) ───
    const statusWeekMap = new Map<string, { total: number; present: number; noShow: number; cancelled: number }>();
    for (const r of reservations) {
      const week = toWeekStr(r.startTime);
      if (!statusWeekMap.has(week)) statusWeekMap.set(week, { total: 0, present: 0, noShow: 0, cancelled: 0 });
      const entry = statusWeekMap.get(week)!;
      entry.total++;
      if (r.status === ReservationStatus.PRESENT) entry.present++;
      else if (r.status === ReservationStatus.NO_SHOW) entry.noShow++;
      else if (r.status === ReservationStatus.CANCELLED) entry.cancelled++;
    }
    const statusOverTime = [...statusWeekMap.entries()]
      .map(([week, v]) => ({
        week,
        showRate: v.total > 0 ? Math.round((v.present / v.total) * 1000) / 10 : 0,
        noShowRate: v.total > 0 ? Math.round((v.noShow / v.total) * 1000) / 10 : 0,
        cancelRate: v.total > 0 ? Math.round((v.cancelled / v.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // ─── Duration distribution ───
    const durationBuckets = new Map<string, number>();
    for (const r of reservations) {
      const mins = (r.endTime.getTime() - r.startTime.getTime()) / 60_000;
      let label: string;
      if (mins <= 30) label = '30min';
      else if (mins <= 60) label = '1u';
      else if (mins <= 90) label = '1u30';
      else if (mins <= 120) label = '2u';
      else label = '2u+';
      durationBuckets.set(label, (durationBuckets.get(label) ?? 0) + 1);
    }
    const bucketOrder = ['30min', '1u', '1u30', '2u', '2u+'];
    const durationDistribution = bucketOrder
      .filter((label) => durationBuckets.has(label))
      .map((label) => ({ label, count: durationBuckets.get(label)! }));

    // ─── Repeat users ───
    const userBookings = new Map<number, number>();
    for (const r of reservations) {
      userBookings.set(r.userId, (userBookings.get(r.userId) ?? 0) + 1);
    }
    const totalUsers = userBookings.size;
    const repeatUserCount = [...userBookings.values()].filter((c) => c > 1).length;
    const repeatUsers = {
      totalUsers,
      repeatUsers: repeatUserCount,
      repeatPercent: totalUsers > 0 ? Math.round((repeatUserCount / totalUsers) * 1000) / 10 : 0,
    };

    // ─── New vs returning users per week ───
    const userFirstSeen = new Map<number, string>();
    const weeklyNewReturning = new Map<string, { new: Set<number>; returning: Set<number> }>();
    for (const r of reservations) {
      const week = toWeekStr(r.startTime);
      if (!weeklyNewReturning.has(week)) weeklyNewReturning.set(week, { new: new Set(), returning: new Set() });
      const entry = weeklyNewReturning.get(week)!;
      if (!userFirstSeen.has(r.userId)) {
        userFirstSeen.set(r.userId, week);
        entry.new.add(r.userId);
      } else if (userFirstSeen.get(r.userId) !== week) {
        entry.returning.add(r.userId);
      }
    }
    const newVsReturning = [...weeklyNewReturning.entries()]
      .map(([week, v]) => ({ week, newUsers: v.new.size, returningUsers: v.returning.size }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // ─── Capacity pressure per time slot ───
    // Group non-cancelled reservations by (date, startHour) per inventory type
    const slotPressure = new Map<string, { counts: number[]; capacity: number }>();
    for (const r of reservations) {
      if (r.status === ReservationStatus.CANCELLED) continue;
      const cap = capacityMap.get(r.inventory) ?? 0;
      if (cap <= 0) continue;
      const hour = r.startTime.getUTCHours();
      const min = r.startTime.getUTCMinutes();
      const slotLabel = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      const dateSlotKey = `${toDateStr(r.startTime)}|${slotLabel}|${r.inventory}`;

      if (!slotPressure.has(slotLabel)) slotPressure.set(slotLabel, { counts: [], capacity: 0 });
      const sp = slotPressure.get(slotLabel)!;
      sp.capacity = Math.max(sp.capacity, cap);

      // Track per date-slot bookings
      const countKey = `${dateSlotKey}`;
      if (!slotPressure.has(countKey)) {
        slotPressure.set(countKey, { counts: [1], capacity: cap });
      } else {
        slotPressure.get(countKey)!.counts[0]++;
      }
    }

    // Aggregate capacity pressure per time slot across all dates and hardware types
    const slotAgg = new Map<string, { bookings: number[]; maxCap: number }>();
    for (const [key, val] of slotPressure.entries()) {
      if (!key.includes('|')) continue; // skip the label-only keys
      const slotLabel = key.split('|')[1];
      if (!slotAgg.has(slotLabel)) slotAgg.set(slotLabel, { bookings: [], maxCap: 0 });
      const agg = slotAgg.get(slotLabel)!;
      agg.bookings.push(val.counts[0]);
      agg.maxCap = Math.max(agg.maxCap, val.capacity);
    }
    const capacityPressure = [...slotAgg.entries()]
      .map(([slot, v]) => ({
        slot,
        maxCapacity: v.maxCap,
        avgBookings: v.bookings.length > 0 ? Math.round((v.bookings.reduce((a, b) => a + b, 0) / v.bookings.length) * 10) / 10 : 0,
        timesAtCapacity: v.bookings.filter((b) => b >= v.maxCap).length,
      }))
      .sort((a, b) => a.slot.localeCompare(b.slot));

    // ─── Top users ───
    const userStats = new Map<
      number,
      { name: string | null; email: string; sNumber: string; total: number; present: number; noShow: number; cancelled: number }
    >();
    for (const r of reservations) {
      if (!userStats.has(r.userId)) {
        userStats.set(r.userId, { name: r.user.name, email: r.email, sNumber: r.user.sNumber, total: 0, present: 0, noShow: 0, cancelled: 0 });
      }
      const u = userStats.get(r.userId)!;
      u.total++;
      if (r.status === ReservationStatus.PRESENT) u.present++;
      else if (r.status === ReservationStatus.NO_SHOW) u.noShow++;
      else if (r.status === ReservationStatus.CANCELLED) u.cancelled++;
    }
    const topUsers = [...userStats.entries()]
      .map(([userId, u]) => ({
        userId,
        name: u.name ?? 'Unknown',
        email: u.email,
        sNumber: u.sNumber,
        totalReservations: u.total,
        showRate: u.total > 0 ? Math.round((u.present / u.total) * 1000) / 10 : 0,
        noShowRate: u.total > 0 ? Math.round((u.noShow / u.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.totalReservations - a.totalReservations)
      .slice(0, 20);

    return {
      dailyCounts,
      weekdayAverages,
      peakHoursHeatmap,
      hardwareBreakdown,
      hardwareOverTime,
      avgControllersPerReservation,
      utilization,
      statusBreakdown,
      statusOverTime,
      durationDistribution,
      repeatUsers,
      newVsReturning,
      capacityPressure,
      topUsers,
    };
  }

  async getUserStatistics(userId: number) {
    const reservations = await this.prisma.reservation.findMany({
      where: { userId },
      select: {
        inventory: true,
        controllers: true,
        startTime: true,
        endTime: true,
        status: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, sNumber: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const total = reservations.length;
    const present = reservations.filter((r) => r.status === ReservationStatus.PRESENT).length;
    const noShow = reservations.filter((r) => r.status === ReservationStatus.NO_SHOW).length;
    const cancelled = reservations.filter((r) => r.status === ReservationStatus.CANCELLED).length;

    // Hardware preference
    const hwCount = new Map<string, number>();
    for (const r of reservations) {
      hwCount.set(r.inventory, (hwCount.get(r.inventory) ?? 0) + 1);
    }
    const hardwareBreakdown = [...hwCount.entries()].map(([inventory, count]) => ({ inventory, count }));

    // Average duration in minutes
    const totalMins = reservations.reduce((s, r) => s + (r.endTime.getTime() - r.startTime.getTime()) / 60_000, 0);
    const avgDurationMinutes = total > 0 ? Math.round(totalMins / total) : 0;

    // Average controllers
    const totalControllers = reservations.reduce((s, r) => s + r.controllers, 0);
    const avgControllers = total > 0 ? Math.round((totalControllers / total) * 10) / 10 : 0;

    // Reservations over time (monthly)
    const monthlyMap = new Map<string, number>();
    for (const r of reservations) {
      const key = r.startTime.toISOString().slice(0, 7); // YYYY-MM
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + 1);
    }
    const reservationsOverTime = [...monthlyMap.entries()].map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month));

    // Preferred time slots
    const slotMap = new Map<number, number>();
    for (const r of reservations) {
      const hour = r.startTime.getUTCHours();
      slotMap.set(hour, (slotMap.get(hour) ?? 0) + 1);
    }
    const preferredSlots = [...slotMap.entries()].map(([hour, count]) => ({ hour, count })).sort((a, b) => a.hour - b.hour);

    return {
      user: { name: user.name ?? 'Unknown', email: user.email, sNumber: user.sNumber },
      totalReservations: total,
      showRate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
      noShowRate: total > 0 ? Math.round((noShow / total) * 1000) / 10 : 0,
      cancelRate: total > 0 ? Math.round((cancelled / total) * 1000) / 10 : 0,
      avgDurationMinutes,
      avgControllers,
      hardwareBreakdown,
      reservationsOverTime,
      preferredSlots,
    };
  }

  async cancelByCuid(cuid: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { cuid },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Reservation is already cancelled');
    }

    if (new Date(reservation.startTime) <= new Date()) {
      throw new BadRequestException('You cannot cancel a reservation that has already started or passed');
    }

    const updatedReservation = await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatus.CANCELLED },
      include: { user: true },
    });

    await this.sendReservationCancelationConfirmationEmail(
      updatedReservation.email,
      updatedReservation.user.sNumber,
      updatedReservation.cuid,
      updatedReservation.inventory,
      updatedReservation.controllers,
      updatedReservation.startTime,
      updatedReservation.endTime,
    );

    return updatedReservation;
  }
}
