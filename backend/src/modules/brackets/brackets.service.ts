import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBracketDto, UpdateBracketDto } from '../../dtos/brackets/bracket.dto.js';

@Injectable()
export class BracketsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Participant emails are only included for staff (`includeContact`); the public bracket shows names. */
  async findByEventId(eventId: number, includeContact = false) {
    const bracket = await this.prisma.bracket.findUnique({
      where: { eventId },
      include: {
        participants: {
          orderBy: { seed: { sort: 'asc', nulls: 'last' } },
          omit: { email: !includeContact },
          include: { user: { select: { id: true, name: true, email: includeContact } } },
        },
        matches: {
          orderBy: [{ round: 'asc' }, { position: 'asc' }],
          include: {
            participants: {
              orderBy: { id: 'asc' },
              include: {
                participant: { omit: { email: !includeContact } },
              },
            },
          },
        },
      },
    });
    return bracket;
  }

  async create(eventId: number, dto: CreateBracketDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { bracket: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.category !== 'TOURNAMENT_BRACKET') {
      throw new BadRequestException('Brackets can only be created for tournament bracket events');
    }
    if (event.bracket) {
      throw new BadRequestException('Event already has a bracket');
    }

    return this.prisma.bracket.create({
      data: {
        eventId,
        playersPerMatch: dto.playersPerMatch,
        advancingPerMatch: dto.advancingPerMatch,
        format: dto.format ?? 'SINGLE_ELIMINATION',
        thirdPlaceMatch: dto.thirdPlaceMatch ?? false,
      },
    });
  }

  async update(eventId: number, dto: UpdateBracketDto) {
    const bracket = await this.prisma.bracket.findUnique({
      where: { eventId },
    });
    if (!bracket) throw new NotFoundException('Bracket not found');
    if (bracket.status !== 'DRAFT') {
      throw new BadRequestException('Can only update bracket settings while in DRAFT status');
    }

    const data: Record<string, unknown> = {};
    if (dto.playersPerMatch !== undefined) data.playersPerMatch = dto.playersPerMatch;
    if (dto.advancingPerMatch !== undefined) data.advancingPerMatch = dto.advancingPerMatch;
    if (dto.thirdPlaceMatch !== undefined) data.thirdPlaceMatch = dto.thirdPlaceMatch;

    return this.prisma.bracket.update({
      where: { eventId },
      data,
    });
  }

  async delete(eventId: number) {
    const bracket = await this.prisma.bracket.findUnique({
      where: { eventId },
    });
    if (!bracket) throw new NotFoundException('Bracket not found');
    await this.prisma.bracket.delete({ where: { eventId } });
  }
}
