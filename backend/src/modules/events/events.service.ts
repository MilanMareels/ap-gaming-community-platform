import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEventDto, UpdateEventDto } from '../../dtos/events/event.dto.js';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.event.findMany({
      orderBy: { startTime: 'asc' },
      include: { _count: { select: { registrations: true } } },
    });
  }

  async findUpcoming() {
    const now = new Date();
    return this.prisma.event.findMany({
      where: {
        endTime: { gte: now },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findById(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { _count: { select: { registrations: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async create(dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        type: dto.type,
        registrationEnabled: dto.registrationEnabled ?? false,
      },
    });
  }

  async update(id: number, dto: UpdateEventDto) {
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = new Date(dto.endTime);
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.registrationEnabled !== undefined) data.registrationEnabled = dto.registrationEnabled;

    return this.prisma.event.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    await this.prisma.event.delete({ where: { id } });
  }
}
