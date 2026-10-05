import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class BracketGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(eventId: number) {
    const bracket = await this.prisma.bracket.findUnique({
      where: { eventId },
      include: {
        participants: {
          orderBy: { seed: { sort: 'asc', nulls: 'last' } },
        },
      },
    });
    if (!bracket) throw new NotFoundException('Bracket not found');
    if (bracket.status !== 'DRAFT') {
      throw new BadRequestException('Bracket has already been generated. Delete and recreate to regenerate.');
    }
    if (bracket.participants.length < 2) {
      throw new BadRequestException('At least 2 participants are required to generate a bracket');
    }

    const { playersPerMatch, advancingPerMatch, thirdPlaceMatch } = bracket;
    const participantCount = bracket.participants.length;

    // Calculate rounds needed
    const totalRounds = Math.ceil(Math.log(participantCount) / Math.log(playersPerMatch));
    const idealSize = Math.pow(playersPerMatch, totalRounds);
    const byeCount = idealSize - participantCount;
    const firstRoundMatchCount = idealSize / playersPerMatch;

    // Seed participants: those with explicit seeds first (sorted), then the rest
    const seeded = bracket.participants.filter((p) => p.seed !== null).sort((a, b) => a.seed! - b.seed!);
    const unseeded = bracket.participants.filter((p) => p.seed === null);
    const orderedParticipants = [...seeded, ...unseeded];

    // Assign seed positions (1-indexed) to all participants
    const seedPositions = orderedParticipants.map((p, i) => ({
      ...p,
      seedPosition: i + 1,
    }));

    // Generate standard tournament seeding order for first round
    const seedOrder = this.generateSeedOrder(idealSize, playersPerMatch);

    // Build match structure from finals backwards (so we can set nextMatchId)
    // Round 1 = first round, Round totalRounds = finals
    const matchesByRound: Array<Array<{ round: number; position: number; id?: number }>> = [];

    for (let round = 1; round <= totalRounds; round++) {
      const matchCount = Math.pow(playersPerMatch, totalRounds - round) / advancingPerMatch;
      const roundMatches: Array<{
        round: number;
        position: number;
        id?: number;
      }> = [];
      for (let pos = 0; pos < matchCount; pos++) {
        roundMatches.push({ round, position: pos });
      }
      matchesByRound.push(roundMatches);
    }

    // Create matches round by round, starting from finals (so we have nextMatchId)
    // We go backwards: create finals first, then semi-finals, etc.
    const createdMatches: Map<string, number> = new Map();

    for (let roundIdx = matchesByRound.length - 1; roundIdx >= 0; roundIdx--) {
      const roundMatches = matchesByRound[roundIdx];
      for (const match of roundMatches) {
        let nextMatchId: number | null = null;
        if (match.round < totalRounds) {
          // This match feeds into a match in the next round
          const nextPosition = Math.floor(match.position / playersPerMatch);
          const nextKey = `${match.round + 1}-${nextPosition}`;
          nextMatchId = createdMatches.get(nextKey) ?? null;
        }

        const created = await this.prisma.bracketMatch.create({
          data: {
            bracketId: bracket.id,
            round: match.round,
            position: match.position,
            nextMatchId,
          },
        });
        createdMatches.set(`${match.round}-${match.position}`, created.id);
      }
    }

    // Create 3rd place match if enabled (only makes sense with >= 4 participants and 2-player matches)
    let thirdPlaceMatchId: number | null = null;
    if (thirdPlaceMatch && totalRounds >= 2 && playersPerMatch === 2 && advancingPerMatch === 1) {
      const created = await this.prisma.bracketMatch.create({
        data: {
          bracketId: bracket.id,
          round: totalRounds,
          position: 1, // position 0 = finals, position 1 = 3rd place
          nextMatchId: null,
        },
      });
      thirdPlaceMatchId = created.id;
    }

    // Assign participants to first round matches
    for (let matchPos = 0; matchPos < firstRoundMatchCount; matchPos++) {
      const matchKey = `1-${matchPos}`;
      const matchId = createdMatches.get(matchKey)!;

      const slotIndices: number[] = [];
      for (let slot = 0; slot < playersPerMatch; slot++) {
        slotIndices.push(matchPos * playersPerMatch + slot);
      }

      const matchParticipants: Array<{
        matchId: number;
        participantId: number | null;
        isBye: boolean;
      }> = [];

      for (const slotIdx of slotIndices) {
        const seedIdx = seedOrder[slotIdx];
        if (seedIdx !== undefined && seedIdx < seedPositions.length) {
          matchParticipants.push({
            matchId,
            participantId: seedPositions[seedIdx].id,
            isBye: false,
          });
        } else {
          // BYE slot
          matchParticipants.push({
            matchId,
            participantId: null,
            isBye: true,
          });
        }
      }

      await this.prisma.bracketMatchParticipant.createMany({
        data: matchParticipants,
      });

      // Check if this match has BYEs - if only one real participant, auto-advance
      const realParticipants = matchParticipants.filter((p) => !p.isBye && p.participantId !== null);

      if (realParticipants.length <= advancingPerMatch && realParticipants.length > 0) {
        // Auto-advance: mark match as BYE, set winners, place in next match
        await this.prisma.bracketMatch.update({
          where: { id: matchId },
          data: { status: 'BYE' },
        });

        // Mark real participants as winners
        for (const rp of realParticipants) {
          await this.prisma.bracketMatchParticipant.updateMany({
            where: { matchId, participantId: rp.participantId },
            data: { isWinner: true },
          });
        }

        // Place winners in next match
        const nextMatchId = (
          await this.prisma.bracketMatch.findUnique({
            where: { id: matchId },
            select: { nextMatchId: true },
          })
        )?.nextMatchId;

        if (nextMatchId) {
          for (const rp of realParticipants) {
            await this.prisma.bracketMatchParticipant.create({
              data: {
                matchId: nextMatchId,
                participantId: rp.participantId,
                isBye: false,
              },
            });
          }
        }
      }
    }

    // Update bracket status and totalRounds
    await this.prisma.bracket.update({
      where: { id: bracket.id },
      data: {
        status: 'GENERATED',
        totalRounds,
      },
    });

    return this.prisma.bracket.findUnique({
      where: { id: bracket.id },
      include: {
        participants: {
          orderBy: { seed: { sort: 'asc', nulls: 'last' } },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        matches: {
          orderBy: [{ round: 'asc' }, { position: 'asc' }],
          include: {
            participants: {
              orderBy: { id: 'asc' },
              include: { participant: true },
            },
          },
        },
      },
    });
  }

  /**
   * Generate standard tournament seeding order.
   * For 8 players in 2-player matches: [0, 7, 3, 4, 1, 6, 2, 5]
   * This ensures seed 1 plays seed 8, seed 2 plays seed 7, etc.
   */
  private generateSeedOrder(size: number, playersPerMatch: number): number[] {
    if (playersPerMatch === 2) {
      return this.generateStandardSeedOrder(size);
    }
    // For N-player matches, just use sequential order
    return Array.from({ length: size }, (_, i) => i);
  }

  private generateStandardSeedOrder(size: number): number[] {
    if (size === 1) return [0];
    if (size === 2) return [0, 1];

    const half = size / 2;
    const firstHalf = this.generateStandardSeedOrder(half);

    // Mirror: pair each seed with its complement
    const result: number[] = [];
    for (const seed of firstHalf) {
      result.push(seed, size - 1 - seed);
    }
    return result;
  }
}
