import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ReservationRulesService } from '../../src/modules/reservations/reservation-rules.service.js';

describe('ReservationRulesService', () => {
  let prisma: { setting: { findMany: jest.Mock<() => Promise<{ key: string; value: string }[]>> } };
  let service: ReservationRulesService;

  const stored = (rules: Record<string, string>) =>
    prisma.setting.findMany.mockResolvedValue(Object.entries(rules).map(([key, value]) => ({ key, value })));

  beforeEach(() => {
    prisma = { setting: { findMany: jest.fn<() => Promise<{ key: string; value: string }[]>>().mockResolvedValue([]) } };
    service = new ReservationRulesService(prisma as any);
  });

  it('falls back to 1 per day and 90 minutes between reservations', async () => {
    await expect(service.get()).resolves.toEqual({ maxPerDay: 1, minGapMinutes: 90 });
  });

  it('reads the stored settings', async () => {
    stored({ 'reservations.maxPerDay': '2', 'reservations.minGapMinutes': '30' });
    await expect(service.get()).resolves.toEqual({ maxPerDay: 2, minGapMinutes: 30 });
  });

  it('keeps 0 so a rule can be switched off', async () => {
    stored({ 'reservations.maxPerDay': '0', 'reservations.minGapMinutes': '0' });
    await expect(service.get()).resolves.toEqual({ maxPerDay: 0, minGapMinutes: 0 });
  });

  it.each(['', 'abc', '-1', '1.5'])('ignores the invalid value %p', async (value) => {
    stored({ 'reservations.maxPerDay': value, 'reservations.minGapMinutes': value });
    await expect(service.get()).resolves.toEqual({ maxPerDay: 1, minGapMinutes: 90 });
  });
});
