import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSpeedrunGameDto, UpdateSpeedrunGameDto } from '../../dtos/speedruns/speedrun-game.dto.js';
import { CreateSpeedrunCategoryDto, UpdateSpeedrunCategoryDto } from '../../dtos/speedruns/speedrun-category.dto.js';
import { CreateSpeedrunLevelDto, UpdateSpeedrunLevelDto } from '../../dtos/speedruns/speedrun-level.dto.js';
import { CreateSpeedrunVariableDto, UpdateSpeedrunVariableDto } from '../../dtos/speedruns/speedrun-variable.dto.js';
import type { ReorderItemDto } from '../../dtos/speedruns/speedrun-category.dto.js';

@Injectable()
export class SpeedrunGamesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Games ──

  async findAll() {
    return this.prisma.speedrunGame.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { runs: true, categories: true } },
      },
    });
  }

  async findBySlug(slug: string) {
    const game = await this.prisma.speedrunGame.findUnique({
      where: { slug },
      include: {
        categories: { orderBy: { position: 'asc' } },
        levels: { orderBy: { position: 'asc' } },
        variables: {
          orderBy: { position: 'asc' },
          include: { values: { orderBy: { position: 'asc' } } },
        },
      },
    });
    if (!game) throw new NotFoundException('Game not found');
    return game;
  }

  async findById(id: number) {
    const game = await this.prisma.speedrunGame.findUnique({
      where: { id },
      include: {
        categories: { orderBy: { position: 'asc' } },
        levels: { orderBy: { position: 'asc' } },
        variables: {
          orderBy: { position: 'asc' },
          include: { values: { orderBy: { position: 'asc' } } },
        },
      },
    });
    if (!game) throw new NotFoundException('Game not found');
    return game;
  }

  async createGame(dto: CreateSpeedrunGameDto) {
    const existing = await this.prisma.speedrunGame.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('A game with this slug already exists');

    return this.prisma.speedrunGame.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        hasInGameTimer: dto.hasInGameTimer ?? false,
      },
    });
  }

  async updateGame(id: number, dto: UpdateSpeedrunGameDto) {
    const game = await this.prisma.speedrunGame.findUnique({ where: { id } });
    if (!game) throw new NotFoundException('Game not found');

    if (dto.slug && dto.slug !== game.slug) {
      const existing = await this.prisma.speedrunGame.findUnique({ where: { slug: dto.slug } });
      if (existing) throw new BadRequestException('A game with this slug already exists');
    }

    return this.prisma.speedrunGame.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.hasInGameTimer !== undefined && { hasInGameTimer: dto.hasInGameTimer }),
      },
    });
  }

  async updateGameCoverImage(id: number, imagePath: string) {
    const game = await this.prisma.speedrunGame.findUnique({ where: { id } });
    if (!game) throw new NotFoundException('Game not found');

    return this.prisma.speedrunGame.update({
      where: { id },
      data: { coverImageUrl: imagePath },
    });
  }

  async deleteGame(id: number) {
    const game = await this.prisma.speedrunGame.findUnique({ where: { id } });
    if (!game) throw new NotFoundException('Game not found');
    await this.prisma.speedrunGame.delete({ where: { id } });
  }

  // ── Categories ──

  async createCategory(gameId: number, dto: CreateSpeedrunCategoryDto) {
    const game = await this.prisma.speedrunGame.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');

    const maxPos = await this.prisma.speedrunCategory.aggregate({
      where: { gameId },
      _max: { position: true },
    });

    return this.prisma.speedrunCategory.create({
      data: {
        gameId,
        name: dto.name,
        rules: dto.rules,
        type: dto.type,
        playerType: dto.playerType ?? 'exactly',
        playerCount: dto.playerCount ?? 1,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });
  }

  async updateCategory(gameId: number, id: number, dto: UpdateSpeedrunCategoryDto) {
    const category = await this.prisma.speedrunCategory.findFirst({ where: { id, gameId } });
    if (!category) throw new NotFoundException('Category not found');

    return this.prisma.speedrunCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.rules !== undefined && { rules: dto.rules }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.playerType !== undefined && { playerType: dto.playerType }),
        ...(dto.playerCount !== undefined && { playerCount: dto.playerCount }),
      },
    });
  }

  async deleteCategory(gameId: number, id: number) {
    const category = await this.prisma.speedrunCategory.findFirst({ where: { id, gameId } });
    if (!category) throw new NotFoundException('Category not found');
    await this.prisma.speedrunCategory.delete({ where: { id } });
  }

  async reorderCategories(gameId: number, items: ReorderItemDto[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.speedrunCategory.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );
  }

  // ── Levels ──

  async createLevel(gameId: number, dto: CreateSpeedrunLevelDto) {
    const game = await this.prisma.speedrunGame.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');

    const maxPos = await this.prisma.speedrunLevel.aggregate({
      where: { gameId },
      _max: { position: true },
    });

    return this.prisma.speedrunLevel.create({
      data: {
        gameId,
        name: dto.name,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });
  }

  async updateLevel(gameId: number, id: number, dto: UpdateSpeedrunLevelDto) {
    const level = await this.prisma.speedrunLevel.findFirst({ where: { id, gameId } });
    if (!level) throw new NotFoundException('Level not found');

    return this.prisma.speedrunLevel.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
      },
    });
  }

  async deleteLevel(gameId: number, id: number) {
    const level = await this.prisma.speedrunLevel.findFirst({ where: { id, gameId } });
    if (!level) throw new NotFoundException('Level not found');
    await this.prisma.speedrunLevel.delete({ where: { id } });
  }

  async reorderLevels(gameId: number, items: ReorderItemDto[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.speedrunLevel.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );
  }

  // ── Variables ──

  async createVariable(gameId: number, dto: CreateSpeedrunVariableDto) {
    const game = await this.prisma.speedrunGame.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');

    if (dto.categoryId) {
      const category = await this.prisma.speedrunCategory.findFirst({ where: { id: dto.categoryId, gameId } });
      if (!category) throw new BadRequestException('Category not found in this game');
    }

    const maxPos = await this.prisma.speedrunVariable.aggregate({
      where: { gameId },
      _max: { position: true },
    });

    return this.prisma.speedrunVariable.create({
      data: {
        gameId,
        categoryId: dto.categoryId ?? null,
        name: dto.name,
        isSubcategory: dto.isSubcategory ?? false,
        isMandatory: dto.isMandatory ?? false,
        scope: dto.scope ?? 'GLOBAL',
        position: (maxPos._max.position ?? -1) + 1,
        values: {
          create: dto.values.map((v, i) => ({
            label: v.label,
            isDefault: v.isDefault ?? false,
            position: i,
          })),
        },
      },
      include: { values: { orderBy: { position: 'asc' } } },
    });
  }

  async updateVariable(gameId: number, id: number, dto: UpdateSpeedrunVariableDto) {
    const variable = await this.prisma.speedrunVariable.findFirst({ where: { id, gameId } });
    if (!variable) throw new NotFoundException('Variable not found');

    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      const category = await this.prisma.speedrunCategory.findFirst({ where: { id: dto.categoryId, gameId } });
      if (!category) throw new BadRequestException('Category not found in this game');
    }

    // Update variable fields
    await this.prisma.speedrunVariable.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.isSubcategory !== undefined && { isSubcategory: dto.isSubcategory }),
        ...(dto.isMandatory !== undefined && { isMandatory: dto.isMandatory }),
        ...(dto.scope !== undefined && { scope: dto.scope }),
      },
    });

    // If values are provided, replace them all
    if (dto.values) {
      await this.prisma.speedrunVariableValue.deleteMany({ where: { variableId: id } });
      await this.prisma.speedrunVariableValue.createMany({
        data: dto.values.map((v, i) => ({
          variableId: id,
          label: v.label,
          isDefault: v.isDefault ?? false,
          position: i,
        })),
      });
    }

    return this.prisma.speedrunVariable.findUnique({
      where: { id },
      include: { values: { orderBy: { position: 'asc' } } },
    });
  }

  async deleteVariable(gameId: number, id: number) {
    const variable = await this.prisma.speedrunVariable.findFirst({ where: { id, gameId } });
    if (!variable) throw new NotFoundException('Variable not found');
    await this.prisma.speedrunVariable.delete({ where: { id } });
  }
}
