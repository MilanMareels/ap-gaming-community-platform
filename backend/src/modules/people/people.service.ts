import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PersonDto } from '../../dtos/people/person.dto.js';

/** A student or staff number such as s123456 (lowercased), or undefined for placeholders like 'N/A'. */
export function normalizeSNumber(value?: string | null): string | undefined {
  const trimmed = value?.trim().toLowerCase();
  return trimmed && /^[a-z]\d{4,}$/.test(trimmed) ? trimmed : undefined;
}

/** Finding people staff pick in the admin UI (for a reservation or a planning team), without duplicating accounts. */
@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  /** People with an account, by name, email or student number; frequent bookers first. */
  async search(search: string): Promise<PersonDto[]> {
    const term = search.trim();
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { sNumber: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, email: true, sNumber: true, _count: { select: { reservations: true } } },
      orderBy: [{ reservations: { _count: 'desc' } }, { name: 'asc' }],
      take: 10,
    });

    return users.map(({ _count, ...user }) => ({ ...user, reservationCount: _count.reservations }));
  }

  /**
   * Finds the person staff mean, so they land on their existing account instead of a duplicate:
   * the picked user, else the email (any casing), else their student number (also as a short
   * student email). Only when none of these match is a new user created.
   */
  async findOrCreate(person: { userId?: number; email?: string; name?: string; sNumber?: string }) {
    const name = person.name?.trim() || undefined;
    const sNumber = normalizeSNumber(person.sNumber) ?? normalizeSNumber(person.email?.split('@')[0]);

    let user = person.userId !== undefined ? await this.prisma.user.findUnique({ where: { id: person.userId } }) : null;
    if (person.userId !== undefined && !user) {
      throw new NotFoundException('User not found');
    }

    const email = person.email?.trim().toLowerCase();
    if (!user && email) {
      user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    }

    if (!user && sNumber) {
      user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { sNumber: { equals: sNumber, mode: 'insensitive' } },
            { email: { equals: `${sNumber}@student.ap.be`, mode: 'insensitive' } },
            { email: { equals: `${sNumber}@ap.be`, mode: 'insensitive' } },
          ],
        },
        // Prefer the account the student signs in with
        orderBy: { microsoftSSOUsers: { _count: 'desc' } },
      });
    }

    if (!user) {
      if (!email) throw new BadRequestException('An email address is required for a new person');
      return this.prisma.user.create({ data: { email, name, sNumber: sNumber ?? 'N/A' } });
    }

    // Fill in what the account is missing, without overwriting what the person set up themselves
    const missing: { name?: string; sNumber?: string } = {};
    if (name && !user.name) missing.name = name;
    if (sNumber && !normalizeSNumber(user.sNumber)) missing.sNumber = sNumber;
    if (Object.keys(missing).length === 0) return user;

    return this.prisma.user.update({ where: { id: user.id }, data: missing });
  }
}
