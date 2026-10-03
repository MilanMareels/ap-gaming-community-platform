import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubmitSpeedrunRunDto, UpdateSpeedrunRunDto } from '../../dtos/speedruns/speedrun-run.dto.js';

@Injectable()
export class SpeedrunRunsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly runInclude = {
    game: { select: { id: true, name: true, slug: true, hasInGameTimer: true } },
    category: { select: { id: true, name: true, type: true } },
    level: { select: { id: true, name: true } },
    submitter: { select: { id: true, name: true, email: true } },
    verifier: { select: { id: true, name: true } },
    players: {
      orderBy: { position: 'asc' as const },
      include: { user: { select: { id: true, name: true } } },
    },
    variableValues: {
      include: {
        variable: { select: { id: true, name: true, isSubcategory: true } },
        value: { select: { id: true, label: true } },
      },
    },
  };

  async findById(id: number) {
    const run = await this.prisma.speedrunRun.findUnique({
      where: { id },
      include: this.runInclude,
    });
    if (!run) throw new NotFoundException('Run not found');
    return run;
  }

  async findPending(gameId?: number) {
    return this.prisma.speedrunRun.findMany({
      where: {
        status: 'PENDING',
        ...(gameId && { gameId }),
      },
      orderBy: { createdAt: 'asc' },
      include: this.runInclude,
    });
  }

  async findByUser(userId: number) {
    return this.prisma.speedrunRun.findMany({
      where: { submitterId: userId },
      orderBy: { createdAt: 'desc' },
      include: this.runInclude,
    });
  }

  async getLeaderboard(
    slug: string,
    categoryId: number,
    levelId?: number,
    subcategoryFilters?: Record<string, string>,
  ) {
    const game = await this.prisma.speedrunGame.findUnique({ where: { slug } });
    if (!game) throw new NotFoundException('Game not found');

    const category = await this.prisma.speedrunCategory.findFirst({
      where: { id: categoryId, gameId: game.id },
    });
    if (!category) throw new NotFoundException('Category not found');

    // Build where clause
    const where: any = {
      gameId: game.id,
      categoryId,
      status: 'VERIFIED',
    };

    if (category.type === 'PER_LEVEL') {
      if (!levelId) throw new BadRequestException('Level ID required for per-level categories');
      where.levelId = levelId;
    }

    // Filter by subcategory variable values
    if (subcategoryFilters && Object.keys(subcategoryFilters).length > 0) {
      where.variableValues = {
        some: {
          OR: Object.entries(subcategoryFilters).map(([variableId, valueId]) => ({
            variableId: parseInt(variableId),
            valueId: parseInt(valueId),
          })),
        },
      };
    }

    // Get all verified runs matching the filters
    const runs = await this.prisma.speedrunRun.findMany({
      where,
      orderBy: { timeMs: 'asc' },
      include: {
        ...this.runInclude,
      },
    });

    // Group by player set (sorted player IDs/names) and keep only best run per player set
    const bestRuns = new Map<string, typeof runs[0]>();
    for (const run of runs) {
      const playerKey = run.players
        .map((p) => p.userId ? `u:${p.userId}` : `g:${p.guestName}`)
        .sort()
        .join('|');

      if (!bestRuns.has(playerKey)) {
        bestRuns.set(playerKey, run);
      }
    }

    // Convert to array and add rank
    const leaderboard = Array.from(bestRuns.values()).map((run, index) => ({
      rank: index + 1,
      ...run,
    }));

    return {
      game: { id: game.id, name: game.name, slug: game.slug, hasInGameTimer: game.hasInGameTimer },
      category: { id: category.id, name: category.name, type: category.type },
      entries: leaderboard,
    };
  }

  async submitRun(userId: number, dto: SubmitSpeedrunRunDto) {
    // Validate game exists
    const game = await this.prisma.speedrunGame.findUnique({ where: { id: dto.gameId } });
    if (!game) throw new NotFoundException('Game not found');

    // Validate category exists and belongs to game
    const category = await this.prisma.speedrunCategory.findFirst({
      where: { id: dto.categoryId, gameId: dto.gameId },
    });
    if (!category) throw new NotFoundException('Category not found');

    // Validate level if per-level category
    if (category.type === 'PER_LEVEL') {
      if (!dto.levelId) throw new BadRequestException('Level required for per-level categories');
      const level = await this.prisma.speedrunLevel.findFirst({
        where: { id: dto.levelId, gameId: dto.gameId },
      });
      if (!level) throw new NotFoundException('Level not found');
    }

    // Validate player count
    if (category.playerType === 'exactly' && dto.players.length !== category.playerCount) {
      throw new BadRequestException(`This category requires exactly ${category.playerCount} player(s)`);
    }
    if (category.playerType === 'up_to' && dto.players.length > category.playerCount) {
      throw new BadRequestException(`This category allows at most ${category.playerCount} player(s)`);
    }
    if (dto.players.length === 0) {
      throw new BadRequestException('At least one player is required');
    }

    // Validate each player has either userId or guestName
    for (const player of dto.players) {
      if (!player.userId && !player.guestName) {
        throw new BadRequestException('Each player must have either a userId or guestName');
      }
    }

    // Validate in-game time is provided if game has in-game timer
    if (game.hasInGameTimer && !dto.inGameTimeMs) {
      throw new BadRequestException('In-game time is required for this game');
    }

    // Validate variable values
    if (dto.variableValues) {
      for (const vv of dto.variableValues) {
        const variable = await this.prisma.speedrunVariable.findFirst({
          where: { id: vv.variableId, gameId: dto.gameId },
        });
        if (!variable) throw new BadRequestException(`Variable ${vv.variableId} not found`);

        const value = await this.prisma.speedrunVariableValue.findFirst({
          where: { id: vv.valueId, variableId: vv.variableId },
        });
        if (!value) throw new BadRequestException(`Value ${vv.valueId} is not valid for variable ${vv.variableId}`);
      }
    }

    // Check mandatory variables are provided
    const mandatoryVariables = await this.prisma.speedrunVariable.findMany({
      where: {
        gameId: dto.gameId,
        isMandatory: true,
        OR: [
          { categoryId: null },
          { categoryId: dto.categoryId },
        ],
      },
    });

    const providedVariableIds = new Set((dto.variableValues ?? []).map((v) => v.variableId));
    for (const mv of mandatoryVariables) {
      // Check scope compatibility
      if (mv.scope === 'FULL_GAME' && category.type !== 'FULL_GAME') continue;
      if (mv.scope === 'PER_LEVEL' && category.type !== 'PER_LEVEL') continue;

      if (!providedVariableIds.has(mv.id)) {
        throw new BadRequestException(`Variable "${mv.name}" is required`);
      }
    }

    return this.prisma.speedrunRun.create({
      data: {
        gameId: dto.gameId,
        categoryId: dto.categoryId,
        levelId: dto.levelId ?? null,
        submitterId: userId,
        timeMs: dto.timeMs,
        inGameTimeMs: dto.inGameTimeMs ?? null,
        videoUrl: dto.videoUrl,
        description: dto.description ?? null,
        runDate: new Date(dto.runDate),
        players: {
          create: dto.players.map((p, i) => ({
            userId: p.userId ?? null,
            guestName: p.guestName ?? null,
            position: i,
          })),
        },
        variableValues: dto.variableValues ? {
          create: dto.variableValues.map((vv) => ({
            variableId: vv.variableId,
            valueId: vv.valueId,
          })),
        } : undefined,
      },
      include: this.runInclude,
    });
  }

  async updateRun(id: number, userId: number, dto: UpdateSpeedrunRunDto) {
    const run = await this.prisma.speedrunRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Run not found');
    if (run.submitterId !== userId) throw new ForbiddenException('You can only edit your own runs');
    if (run.status !== 'PENDING') throw new BadRequestException('Only pending runs can be edited');

    // Update basic fields
    await this.prisma.speedrunRun.update({
      where: { id },
      data: {
        ...(dto.timeMs !== undefined && { timeMs: dto.timeMs }),
        ...(dto.inGameTimeMs !== undefined && { inGameTimeMs: dto.inGameTimeMs }),
        ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.runDate !== undefined && { runDate: new Date(dto.runDate) }),
      },
    });

    // Update players if provided
    if (dto.players) {
      await this.prisma.speedrunRunPlayer.deleteMany({ where: { runId: id } });
      await this.prisma.speedrunRunPlayer.createMany({
        data: dto.players.map((p, i) => ({
          runId: id,
          userId: p.userId ?? null,
          guestName: p.guestName ?? null,
          position: i,
        })),
      });
    }

    // Update variable values if provided
    if (dto.variableValues) {
      await this.prisma.speedrunRunVariableValue.deleteMany({ where: { runId: id } });
      await this.prisma.speedrunRunVariableValue.createMany({
        data: dto.variableValues.map((vv) => ({
          runId: id,
          variableId: vv.variableId,
          valueId: vv.valueId,
        })),
      });
    }

    return this.findById(id);
  }

  async deleteRun(id: number, userId: number, isAdmin: boolean) {
    const run = await this.prisma.speedrunRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Run not found');

    if (!isAdmin) {
      if (run.submitterId !== userId) throw new ForbiddenException('You can only delete your own runs');
      if (run.status !== 'PENDING') throw new BadRequestException('Only pending runs can be deleted');
    }

    await this.prisma.speedrunRun.delete({ where: { id } });
  }

  async verifyRun(id: number, verifierId: number) {
    const run = await this.prisma.speedrunRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Run not found');
    if (run.status !== 'PENDING') throw new BadRequestException('Only pending runs can be verified');

    return this.prisma.speedrunRun.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifierId,
        verifiedAt: new Date(),
      },
      include: this.runInclude,
    });
  }

  async rejectRun(id: number, verifierId: number, reason: string) {
    const run = await this.prisma.speedrunRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Run not found');
    if (run.status !== 'PENDING') throw new BadRequestException('Only pending runs can be rejected');

    return this.prisma.speedrunRun.update({
      where: { id },
      data: {
        status: 'REJECTED',
        verifierId,
        verifiedAt: new Date(),
        rejectionReason: reason,
      },
      include: this.runInclude,
    });
  }
}
