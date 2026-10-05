import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddTimeTrialParticipantDto } from '../../dtos/time-trials/time-trial-entry.dto.js';

@Injectable()
export class TimeTrialEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async addParticipant(eventId: number, dto: AddTimeTrialParticipantDto) {
    const timeTrial = await this.prisma.timeTrial.findUnique({
      where: { eventId },
    });
    if (!timeTrial) throw new NotFoundException('Time trial not found');

    let userId = dto.userId ?? null;
    if (!userId && dto.email) {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (user) userId = user.id;
    }

    return this.prisma.timeTrialParticipant.create({
      data: {
        timeTrialId: timeTrial.id,
        name: dto.name,
        email: dto.email,
        userId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        runs: { orderBy: { timeMs: 'asc' } },
      },
    });
  }

  async removeParticipant(eventId: number, participantId: number) {
    const timeTrial = await this.prisma.timeTrial.findUnique({
      where: { eventId },
    });
    if (!timeTrial) throw new NotFoundException('Time trial not found');

    const participant = await this.prisma.timeTrialParticipant.findFirst({
      where: { id: participantId, timeTrialId: timeTrial.id },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    await this.prisma.timeTrialParticipant.delete({
      where: { id: participantId },
    });
  }

  async addRun(eventId: number, participantId: number, timeMs: number) {
    const timeTrial = await this.prisma.timeTrial.findUnique({
      where: { eventId },
    });
    if (!timeTrial) throw new NotFoundException('Time trial not found');

    const participant = await this.prisma.timeTrialParticipant.findFirst({
      where: { id: participantId, timeTrialId: timeTrial.id },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    const run = await this.prisma.timeTrialRun.create({
      data: { participantId, timeMs },
    });

    // Recalculate best time
    await this.recalculateBestTime(participantId);

    return run;
  }

  async deleteRun(eventId: number, runId: number) {
    const timeTrial = await this.prisma.timeTrial.findUnique({
      where: { eventId },
    });
    if (!timeTrial) throw new NotFoundException('Time trial not found');

    const run = await this.prisma.timeTrialRun.findUnique({
      where: { id: runId },
      include: { participant: true },
    });
    if (!run || run.participant.timeTrialId !== timeTrial.id) {
      throw new NotFoundException('Run not found');
    }

    const participantId = run.participantId;
    await this.prisma.timeTrialRun.delete({ where: { id: runId } });

    // Recalculate best time
    await this.recalculateBestTime(participantId);
  }

  async getRuns(eventId: number, participantId: number) {
    const timeTrial = await this.prisma.timeTrial.findUnique({
      where: { eventId },
    });
    if (!timeTrial) throw new NotFoundException('Time trial not found');

    const participant = await this.prisma.timeTrialParticipant.findFirst({
      where: { id: participantId, timeTrialId: timeTrial.id },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    return this.prisma.timeTrialRun.findMany({
      where: { participantId },
      orderBy: { timeMs: 'asc' },
    });
  }

  private async recalculateBestTime(participantId: number) {
    const bestRun = await this.prisma.timeTrialRun.findFirst({
      where: { participantId },
      orderBy: { timeMs: 'asc' },
    });

    await this.prisma.timeTrialParticipant.update({
      where: { id: participantId },
      data: { bestTimeMs: bestRun?.timeMs ?? null },
    });
  }
}
