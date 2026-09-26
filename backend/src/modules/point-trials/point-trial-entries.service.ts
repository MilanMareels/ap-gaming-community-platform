import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddPointTrialParticipantDto } from '../../dtos/point-trials/point-trial-entry.dto.js';

@Injectable()
export class PointTrialEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async addParticipant(eventId: number, dto: AddPointTrialParticipantDto) {
    const pointTrial = await this.prisma.pointTrial.findUnique({
      where: { eventId },
    });
    if (!pointTrial) throw new NotFoundException('Point trial not found');

    let userId = dto.userId ?? null;
    if (!userId && dto.email) {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (user) userId = user.id;
    }

    return this.prisma.pointTrialParticipant.create({
      data: {
        pointTrialId: pointTrial.id,
        name: dto.name,
        email: dto.email,
        userId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        entries: { orderBy: { points: 'desc' } },
      },
    });
  }

  async removeParticipant(eventId: number, participantId: number) {
    const pointTrial = await this.prisma.pointTrial.findUnique({
      where: { eventId },
    });
    if (!pointTrial) throw new NotFoundException('Point trial not found');

    const participant = await this.prisma.pointTrialParticipant.findFirst({
      where: { id: participantId, pointTrialId: pointTrial.id },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    await this.prisma.pointTrialParticipant.delete({
      where: { id: participantId },
    });
  }

  async addEntry(eventId: number, participantId: number, points: number) {
    const pointTrial = await this.prisma.pointTrial.findUnique({
      where: { eventId },
    });
    if (!pointTrial) throw new NotFoundException('Point trial not found');

    const participant = await this.prisma.pointTrialParticipant.findFirst({
      where: { id: participantId, pointTrialId: pointTrial.id },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    const entry = await this.prisma.pointTrialEntry.create({
      data: { participantId, points },
    });

    await this.recalculateBestPoints(participantId);

    return entry;
  }

  async deleteEntry(eventId: number, entryId: number) {
    const pointTrial = await this.prisma.pointTrial.findUnique({
      where: { eventId },
    });
    if (!pointTrial) throw new NotFoundException('Point trial not found');

    const entry = await this.prisma.pointTrialEntry.findUnique({
      where: { id: entryId },
      include: { participant: true },
    });
    if (!entry || entry.participant.pointTrialId !== pointTrial.id) {
      throw new NotFoundException('Entry not found');
    }

    const participantId = entry.participantId;
    await this.prisma.pointTrialEntry.delete({ where: { id: entryId } });

    await this.recalculateBestPoints(participantId);
  }

  async getEntries(eventId: number, participantId: number) {
    const pointTrial = await this.prisma.pointTrial.findUnique({
      where: { eventId },
    });
    if (!pointTrial) throw new NotFoundException('Point trial not found');

    const participant = await this.prisma.pointTrialParticipant.findFirst({
      where: { id: participantId, pointTrialId: pointTrial.id },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    return this.prisma.pointTrialEntry.findMany({
      where: { participantId },
      orderBy: { points: 'desc' },
    });
  }

  private async recalculateBestPoints(participantId: number) {
    const bestEntry = await this.prisma.pointTrialEntry.findFirst({
      where: { participantId },
      orderBy: { points: 'desc' },
    });

    await this.prisma.pointTrialParticipant.update({
      where: { id: participantId },
      data: { bestPoints: bestEntry?.points ?? null },
    });
  }
}
