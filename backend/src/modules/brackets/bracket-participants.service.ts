import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddParticipantDto } from '../../dtos/brackets/bracket-participant.dto.js';

@Injectable()
export class BracketParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  async addParticipant(eventId: number, dto: AddParticipantDto) {
    const bracket = await this.prisma.bracket.findUnique({
      where: { eventId },
    });
    if (!bracket) throw new NotFoundException('Bracket not found');
    if (bracket.status !== 'DRAFT') {
      throw new BadRequestException('Can only add participants while bracket is in DRAFT status');
    }

    // If email provided, try to find matching user
    let userId = dto.userId ?? null;
    if (!userId && dto.email) {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (user) userId = user.id;
    }

    return this.prisma.bracketParticipant.create({
      data: {
        bracketId: bracket.id,
        name: dto.name,
        email: dto.email,
        userId,
        seed: dto.seed,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async removeParticipant(eventId: number, participantId: number) {
    const bracket = await this.prisma.bracket.findUnique({
      where: { eventId },
    });
    if (!bracket) throw new NotFoundException('Bracket not found');
    if (bracket.status !== 'DRAFT') {
      throw new BadRequestException('Can only remove participants while bracket is in DRAFT status');
    }

    const participant = await this.prisma.bracketParticipant.findFirst({
      where: { id: participantId, bracketId: bracket.id },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    await this.prisma.bracketParticipant.delete({
      where: { id: participantId },
    });
  }

  async importFromRegistrations(eventId: number) {
    const bracket = await this.prisma.bracket.findUnique({
      where: { eventId },
    });
    if (!bracket) throw new NotFoundException('Bracket not found');
    if (bracket.status !== 'DRAFT') {
      throw new BadRequestException('Can only import participants while bracket is in DRAFT status');
    }

    const registrations = await this.prisma.eventRegistration.findMany({
      where: { eventId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    // Get existing participant emails to avoid duplicates
    const existingParticipants = await this.prisma.bracketParticipant.findMany({
      where: { bracketId: bracket.id },
      select: { email: true, userId: true },
    });
    const existingEmails = new Set(existingParticipants.map((p) => p.email).filter(Boolean));
    const existingUserIds = new Set(existingParticipants.map((p) => p.userId).filter(Boolean));

    const toCreate = registrations.filter((r) => !existingEmails.has(r.user.email) && !existingUserIds.has(r.user.id));

    if (toCreate.length === 0) {
      return { imported: 0 };
    }

    await this.prisma.bracketParticipant.createMany({
      data: toCreate.map((r) => ({
        bracketId: bracket.id,
        name: r.user.name ?? r.user.email,
        email: r.user.email,
        userId: r.user.id,
      })),
    });

    return { imported: toCreate.length };
  }
}
