import { describe, it, expect, jest } from '@jest/globals';
import { PeopleService, normalizeSNumber } from '../../src/modules/people/people.service.js';

describe('PeopleService', () => {
  it('searches people by name, email or student number with their booking count', async () => {
    const prisma = {
      user: {
        findMany: jest
          .fn<(args: unknown) => Promise<unknown[]>>()
          .mockResolvedValue([{ id: 1, name: 'Robin', email: 'r@x.be', sNumber: 's1', _count: { reservations: 4 } }]),
      },
    };
    const service = new PeopleService(prisma as any);

    await expect(service.search(' rob ')).resolves.toEqual([{ id: 1, name: 'Robin', email: 'r@x.be', sNumber: 's1', reservationCount: 4 }]);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: 'rob', mode: 'insensitive' } },
            { email: { contains: 'rob', mode: 'insensitive' } },
            { sNumber: { contains: 'rob', mode: 'insensitive' } },
          ],
        },
        take: 10,
      }),
    );
  });

  it('recognises student numbers and ignores placeholders', () => {
    expect(normalizeSNumber(' S123456 ')).toBe('s123456');
    expect(normalizeSNumber('N/A')).toBeUndefined();
    expect(normalizeSNumber('msft_1a2b3c')).toBeUndefined();
  });
});
