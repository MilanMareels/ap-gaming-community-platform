import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateTimeTrialStatusDto } from '../../dtos/time-trials/time-trial.dto.js';

@Injectable()
export class TimeTrialsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEventId(eventId: number) {
    return this.prisma.timeTrial.findUnique({
      where: { eventId },
      include: {
        participants: {
          orderBy: { bestTimeMs: { sort: 'asc', nulls: 'last' } },
          include: {
            user: { select: { id: true, name: true, email: true } },
            runs: { orderBy: { timeMs: 'asc' } },
          },
        },
      },
    });
  }

  async create(eventId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { timeTrial: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.category !== 'TOURNAMENT_TIMED') {
      throw new BadRequestException(
        'Time trials can only be created for timed tournament events',
      );
    }
    if (event.timeTrial) {
      throw new BadRequestException('Event already has a time trial');
    }

    return this.prisma.timeTrial.create({
      data: { eventId },
    });
  }

  async updateStatus(eventId: number, dto: UpdateTimeTrialStatusDto) {
    const timeTrial = await this.prisma.timeTrial.findUnique({
      where: { eventId },
    });
    if (!timeTrial) throw new NotFoundException('Time trial not found');

    const allowed: Record<string, string[]> = {
      ACTIVE: ['COMPLETED'],
      COMPLETED: ['ACTIVE'],
    };

    if (!allowed[timeTrial.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${timeTrial.status} to ${dto.status}`,
      );
    }

    return this.prisma.timeTrial.update({
      where: { eventId },
      data: { status: dto.status },
    });
  }

  async delete(eventId: number) {
    const timeTrial = await this.prisma.timeTrial.findUnique({
      where: { eventId },
    });
    if (!timeTrial) throw new NotFoundException('Time trial not found');
    await this.prisma.timeTrial.delete({ where: { eventId } });
  }
}
