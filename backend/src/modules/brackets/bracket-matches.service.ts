import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateMatchResultDto } from '../../dtos/brackets/bracket-match.dto.js';

@Injectable()
export class BracketMatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async swapParticipants(eventId: number, participantAId: number, participantBId: number) {
    const bracket = await this.prisma.bracket.findUnique({
      where: { eventId },
      include: {
        matches: {
          where: { round: 1 },
          include: { participants: true },
        },
      },
    });
    if (!bracket) throw new NotFoundException('Bracket not found');
    if (bracket.status !== 'GENERATED') {
      throw new BadRequestException('Can only swap participants when bracket is in GENERATED status');
    }

    // Find the two match-participant records in round 1
    let slotA: { id: number; matchId: number } | null = null;
    let slotB: { id: number; matchId: number } | null = null;

    for (const match of bracket.matches) {
      // Ensure no scores have been entered in this match
      for (const mp of match.participants) {
        if (mp.participantId === participantAId && !mp.isBye) {
          if (mp.score !== null) {
            throw new BadRequestException('Cannot swap: scores have already been entered');
          }
          slotA = { id: mp.id, matchId: mp.matchId };
        }
        if (mp.participantId === participantBId && !mp.isBye) {
          if (mp.score !== null) {
            throw new BadRequestException('Cannot swap: scores have already been entered');
          }
          slotB = { id: mp.id, matchId: mp.matchId };
        }
      }
    }

    if (!slotA) {
      throw new NotFoundException(`Participant ${participantAId} not found in round 1`);
    }
    if (!slotB) {
      throw new NotFoundException(`Participant ${participantBId} not found in round 1`);
    }

    // Swap the participantId values
    await this.prisma.$transaction([
      this.prisma.bracketMatchParticipant.update({
        where: { id: slotA.id },
        data: { participantId: participantBId },
      }),
      this.prisma.bracketMatchParticipant.update({
        where: { id: slotB.id },
        data: { participantId: participantAId },
      }),
    ]);

    return { swapped: true };
  }

  async updateMatchStatus(eventId: number, matchId: number, status: 'IN_PROGRESS' | 'PENDING') {
    const bracket = await this.prisma.bracket.findUnique({
      where: { eventId },
    });
    if (!bracket) throw new NotFoundException('Bracket not found');

    const match = await this.prisma.bracketMatch.findFirst({
      where: { id: matchId, bracketId: bracket.id },
    });
    if (!match) throw new NotFoundException('Match not found');
    if (match.status === 'COMPLETED' || match.status === 'BYE') {
      throw new BadRequestException('Cannot change status of a completed or BYE match');
    }

    await this.prisma.bracketMatch.update({
      where: { id: matchId },
      data: { status },
    });

    // If starting first match, set bracket to IN_PROGRESS
    if (status === 'IN_PROGRESS' && bracket.status === 'GENERATED') {
      await this.prisma.bracket.update({
        where: { id: bracket.id },
        data: { status: 'IN_PROGRESS' },
      });
    }
  }

  async submitResult(eventId: number, matchId: number, dto: UpdateMatchResultDto) {
    const bracket = await this.prisma.bracket.findUnique({
      where: { eventId },
    });
    if (!bracket) throw new NotFoundException('Bracket not found');

    const match = await this.prisma.bracketMatch.findFirst({
      where: { id: matchId, bracketId: bracket.id },
      include: {
        participants: {
          include: { participant: true },
          where: { isBye: false },
        },
      },
    });
    if (!match) throw new NotFoundException('Match not found');
    if (match.status === 'BYE') {
      throw new BadRequestException('Cannot submit results for a BYE match');
    }

    // Validate all non-BYE participants have scores
    const matchParticipantIds = match.participants.map((p) => p.participantId);
    for (const result of dto.results) {
      if (!matchParticipantIds.includes(result.participantId)) {
        throw new BadRequestException(`Participant ${result.participantId} is not in this match`);
      }
    }

    // Update scores
    for (const result of dto.results) {
      await this.prisma.bracketMatchParticipant.updateMany({
        where: {
          matchId,
          participantId: result.participantId,
        },
        data: { score: result.score },
      });
    }

    // Determine winners (top N by score, where N = advancingPerMatch)
    const sortedResults = [...dto.results].sort((a, b) => b.score - a.score);
    const winnerIds = sortedResults.slice(0, bracket.advancingPerMatch).map((r) => r.participantId);
    const loserIds = sortedResults.slice(bracket.advancingPerMatch).map((r) => r.participantId);

    // Mark winners
    for (const winnerId of winnerIds) {
      await this.prisma.bracketMatchParticipant.updateMany({
        where: { matchId, participantId: winnerId },
        data: { isWinner: true },
      });
    }

    // Mark losers as not winner (in case of re-submission)
    for (const loserId of loserIds) {
      await this.prisma.bracketMatchParticipant.updateMany({
        where: { matchId, participantId: loserId },
        data: { isWinner: false },
      });
    }

    // Set match as completed
    await this.prisma.bracketMatch.update({
      where: { id: matchId },
      data: { status: 'COMPLETED' },
    });

    // If bracket was GENERATED, move to IN_PROGRESS
    if (bracket.status === 'GENERATED') {
      await this.prisma.bracket.update({
        where: { id: bracket.id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Advance winners to next match
    if (match.nextMatchId) {
      for (const winnerId of winnerIds) {
        // Check if already placed (from a previous submission)
        const existing = await this.prisma.bracketMatchParticipant.findFirst({
          where: {
            matchId: match.nextMatchId,
            participantId: winnerId,
          },
        });
        if (!existing) {
          await this.prisma.bracketMatchParticipant.create({
            data: {
              matchId: match.nextMatchId,
              participantId: winnerId,
              isBye: false,
            },
          });
        }
      }
    }

    // Handle 3rd place match: place losers of semi-finals
    if (bracket.thirdPlaceMatch && match.round === bracket.totalRounds - 1 && bracket.playersPerMatch === 2 && bracket.advancingPerMatch === 1) {
      // Find the 3rd place match (round = totalRounds, position = 1)
      const thirdPlaceMatch = await this.prisma.bracketMatch.findFirst({
        where: {
          bracketId: bracket.id,
          round: bracket.totalRounds,
          position: 1,
        },
      });

      if (thirdPlaceMatch) {
        for (const loserId of loserIds) {
          const existing = await this.prisma.bracketMatchParticipant.findFirst({
            where: {
              matchId: thirdPlaceMatch.id,
              participantId: loserId,
            },
          });
          if (!existing) {
            await this.prisma.bracketMatchParticipant.create({
              data: {
                matchId: thirdPlaceMatch.id,
                participantId: loserId,
                isBye: false,
              },
            });
          }
        }
      }
    }

    // Check if bracket is complete (all matches done)
    const pendingMatches = await this.prisma.bracketMatch.count({
      where: {
        bracketId: bracket.id,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    if (pendingMatches === 0) {
      await this.prisma.bracket.update({
        where: { id: bracket.id },
        data: { status: 'COMPLETED' },
      });
    }
  }
}
