import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class EventRegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async register(eventId: number, userId: number) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (!event.registrationEnabled) throw new BadRequestException('Registration is not enabled for this event');

    return this.prisma.eventRegistration.create({
      data: { eventId, userId },
    });
  }

  async unregister(eventId: number, userId: number) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (!registration) throw new NotFoundException('Registration not found');

    await this.prisma.eventRegistration.delete({
      where: { id: registration.id },
    });
  }

  async getRegistrations(eventId: number) {
    return this.prisma.eventRegistration.findMany({
      where: { eventId },
      include: { user: { select: { id: true, name: true, email: true, sNumber: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async isRegistered(eventId: number, userId: number) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    return { registered: !!registration };
  }
}
