import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEventDto, UpdateEventDto } from '../../dtos/events/event.dto.js';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.event.findMany({
      orderBy: { startTime: 'asc' },
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

  async create(dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        title: dto.title,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        type: dto.type,
      },
    });
  }

  async update(id: number, dto: UpdateEventDto) {
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = new Date(dto.endTime);
    if (dto.type !== undefined) data.type = dto.type;

    return this.prisma.event.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    await this.prisma.event.delete({ where: { id } });
  }
}
