import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { EsportsResultsService } from '../../src/modules/esports-results/esports-results.service.js';
import { PrismaService } from '../../src/modules/prisma/prisma.service.js';
import { EsportsMatchResult } from '../../src/generated/prisma/enums.js';

describe('EsportsResultsService', () => {
  let service: EsportsResultsService;
  let prisma: any;

  const match = {
    gameId: 1,
    opponent: ' KdG Esports ',
    competition: '',
    playedAt: '2026-11-20T19:00:00.000Z',
    result: EsportsMatchResult.WIN,
    ourScore: 2,
    opponentScore: 1,
    vodUrl: 'https://www.twitch.tv/videos/1',
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EsportsResultsService,
        {
          provide: PrismaService,
          useValue: {
            esportsMatch: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
            rosterGame: { findUnique: jest.fn<() => Promise<{ id: number }>>().mockResolvedValue({ id: 1 }) },
          },
        },
      ],
    }).compile();

    service = module.get(EsportsResultsService);
    prisma = module.get(PrismaService);
  });

  it('lists matches newest first with their team, optionally for one team', async () => {
    await service.findAll();
    expect(prisma.esportsMatch.findMany).toHaveBeenCalledWith({
      where: undefined,
      include: { game: { select: { id: true, name: true } } },
      orderBy: { playedAt: 'desc' },
    });

    await service.findAll(3);
    expect(prisma.esportsMatch.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { gameId: 3 } }));
  });

  it('stores a result with trimmed text and empty fields as null', async () => {
    await service.create(match);

    expect(prisma.esportsMatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gameId: 1,
          opponent: 'KdG Esports',
          competition: null,
          playedAt: new Date(match.playedAt),
          result: EsportsMatchResult.WIN,
          ourScore: 2,
          opponentScore: 1,
          vodUrl: 'https://www.twitch.tv/videos/1',
        }),
      }),
    );
  });

  it('keeps no score for an upcoming match', async () => {
    await service.create({ ...match, result: EsportsMatchResult.UPCOMING });
    expect(prisma.esportsMatch.create.mock.calls[0][0].data).toEqual(expect.objectContaining({ ourScore: null, opponentScore: null }));
  });

  it('refuses a team that does not exist', async () => {
    prisma.rosterGame.findUnique.mockResolvedValue(null);
    await expect(service.create(match)).rejects.toThrow(NotFoundException);
    expect(prisma.esportsMatch.create).not.toHaveBeenCalled();
  });

  it('only changes the fields that are sent on edit', async () => {
    prisma.esportsMatch.findUnique.mockResolvedValue({ id: 4, result: EsportsMatchResult.UPCOMING });

    await service.update(4, { result: EsportsMatchResult.LOSS, ourScore: 0, opponentScore: 2 });

    const { data } = prisma.esportsMatch.update.mock.calls[0][0];
    expect(data).toEqual(expect.objectContaining({ result: EsportsMatchResult.LOSS, ourScore: 0, opponentScore: 2 }));
    expect(data.opponent).toBeUndefined();
    expect(data.playedAt).toBeUndefined();
  });

  it('clears the score when an edit leaves the match upcoming', async () => {
    prisma.esportsMatch.findUnique.mockResolvedValue({ id: 4, result: EsportsMatchResult.UPCOMING });
    await service.update(4, { ourScore: 3 });
    expect(prisma.esportsMatch.update.mock.calls[0][0].data).toEqual(expect.objectContaining({ ourScore: null, opponentScore: null }));
  });

  it('reports a missing match on edit and delete', async () => {
    prisma.esportsMatch.findUnique.mockResolvedValue(null);
    await expect(service.update(9, { opponent: 'x' })).rejects.toThrow(NotFoundException);
    await expect(service.remove(9)).rejects.toThrow(NotFoundException);
  });
});
