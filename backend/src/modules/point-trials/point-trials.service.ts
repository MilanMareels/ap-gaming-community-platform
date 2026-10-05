import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdatePointTrialStatusDto } from '../../dtos/point-trials/point-trial.dto.js';

@Injectable()
export class PointTrialsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEventId(eventId: number) {
    return this.prisma.pointTrial.findUnique({
      where: { eventId },
      include: {
        participants: {
          orderBy: { bestPoints: { sort: 'desc', nulls: 'last' } },
          include: {
            user: { select: { id: true, name: true, email: true } },
            entries: { orderBy: { points: 'desc' } },
          },
        },
      },
    });
  }

  async create(eventId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { pointTrial: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.category !== 'TOURNAMENT_POINTS') {
      throw new BadRequestException('Point trials can only be created for point-based tournament events');
    }
    if (event.pointTrial) {
      throw new BadRequestException('Event already has a point trial');
    }

    return this.prisma.pointTrial.create({
      data: { eventId },
    });
  }

  async updateStatus(eventId: number, dto: UpdatePointTrialStatusDto) {
    const pointTrial = await this.prisma.pointTrial.findUnique({
      where: { eventId },
    });
    if (!pointTrial) throw new NotFoundException('Point trial not found');

    const allowed: Record<string, string[]> = {
      ACTIVE: ['COMPLETED'],
      COMPLETED: ['ACTIVE'],
    };

    if (!allowed[pointTrial.status]?.includes(dto.status)) {
      throw new BadRequestException(`Cannot transition from ${pointTrial.status} to ${dto.status}`);
    }

    return this.prisma.pointTrial.update({
      where: { eventId },
      data: { status: dto.status },
    });
  }

  async delete(eventId: number) {
    const pointTrial = await this.prisma.pointTrial.findUnique({
      where: { eventId },
    });
    if (!pointTrial) throw new NotFoundException('Point trial not found');
    await this.prisma.pointTrial.delete({ where: { eventId } });
  }
}
