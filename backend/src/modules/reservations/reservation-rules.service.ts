import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/** Setting keys for the per-member reservation limits, editable in the admin settings. */
export const RESERVATION_RULE_KEYS = {
  maxPerDay: 'reservations.maxPerDay',
  minGapMinutes: 'reservations.minGapMinutes',
} as const;

export interface ReservationRules {
  /** Active reservations a member may have on one day; 0 means no limit. */
  maxPerDay: number;
  /** Minutes required between two of a member's reservations; 0 means none. */
  minGapMinutes: number;
}

export const DEFAULT_RESERVATION_RULES: ReservationRules = { maxPerDay: 1, minGapMinutes: 90 };

@Injectable()
export class ReservationRulesService {
  constructor(private readonly prisma: PrismaService) {}

  /** The configured limits, falling back to the defaults for missing or invalid values. */
  async get(): Promise<ReservationRules> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: Object.values(RESERVATION_RULE_KEYS) } },
    });
    const read = (key: string, fallback: number) => {
      const value = rows.find((row) => row.key === key)?.value.trim();
      return value && /^\d+$/.test(value) ? Number(value) : fallback;
    };

    return {
      maxPerDay: read(RESERVATION_RULE_KEYS.maxPerDay, DEFAULT_RESERVATION_RULES.maxPerDay),
      minGapMinutes: read(RESERVATION_RULE_KEYS.minGapMinutes, DEFAULT_RESERVATION_RULES.minGapMinutes),
    };
  }
}
