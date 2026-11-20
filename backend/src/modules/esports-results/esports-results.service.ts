import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEsportsMatchDto, UpdateEsportsMatchDto } from '../../dtos/esports-results/esports-match.dto.js';
import { EsportsMatchResult } from '../../generated/prisma/enums.js';

const withTeam = { game: { select: { id: true, name: true } } } as const;

/** Empty optional text is stored as null, so clearing a field in a form removes it. */
const orNull = (value: string | null | undefined) => (value === undefined ? undefined : value?.trim() || null);

@Injectable()
export class EsportsResultsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest first; the public page shows upcoming matches separately. */
  findAll(gameId?: number) {
    return this.prisma.esportsMatch.findMany({
      where: gameId === undefined ? undefined : { gameId },
      include: withTeam,
      orderBy: { playedAt: 'desc' },
    });
  }

  async create(dto: CreateEsportsMatchDto) {
    await this.assertTeamExists(dto.gameId);
    this.assertScore(dto.result, dto.ourScore, dto.opponentScore);
    return this.prisma.esportsMatch.create({
      data: { ...this.toData(dto), gameId: dto.gameId, opponent: dto.opponent.trim(), playedAt: new Date(dto.playedAt), result: dto.result },
      include: withTeam,
    });
  }

  async update(id: number, dto: UpdateEsportsMatchDto) {
    const existing = await this.prisma.esportsMatch.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Match not found');
    if (dto.gameId !== undefined) await this.assertTeamExists(dto.gameId);
    this.assertScore(
      dto.result ?? existing.result,
      dto.ourScore !== undefined ? dto.ourScore : existing.ourScore,
      dto.opponentScore !== undefined ? dto.opponentScore : existing.opponentScore,
    );

    const data = this.toData(dto);
    // A match that is (still) upcoming has no score yet
    if ((dto.result ?? existing.result) === EsportsMatchResult.UPCOMING) {
      data.ourScore = null;
      data.opponentScore = null;
    }
    return this.prisma.esportsMatch.update({ where: { id }, data, include: withTeam });
  }

  async remove(id: number) {
    const existing = await this.prisma.esportsMatch.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Match not found');
    await this.prisma.esportsMatch.delete({ where: { id } });
  }

  /** A result may have no score (just who won), but not only one side of a score. */
  private assertScore(result: EsportsMatchResult, ourScore?: number | null, opponentScore?: number | null) {
    if (result === EsportsMatchResult.UPCOMING) return;
    if ((ourScore == null) !== (opponentScore == null)) {
      throw new BadRequestException('Fill in both scores, or neither when there is no score');
    }
  }

  private async assertTeamExists(gameId: number) {
    const team = await this.prisma.rosterGame.findUnique({ where: { id: gameId }, select: { id: true } });
    if (!team) throw new NotFoundException('Team not found');
  }

  private toData(dto: UpdateEsportsMatchDto) {
    const upcoming = dto.result === EsportsMatchResult.UPCOMING;
    return {
      gameId: dto.gameId,
      opponent: dto.opponent?.trim(),
      competition: orNull(dto.competition),
      playedAt: dto.playedAt === undefined ? undefined : new Date(dto.playedAt),
      result: dto.result,
      ourScore: upcoming ? null : dto.ourScore,
      opponentScore: upcoming ? null : dto.opponentScore,
      vodUrl: orNull(dto.vodUrl),
      notes: orNull(dto.notes),
    };
  }
}
