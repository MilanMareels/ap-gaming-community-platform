import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTimeTableEntryDto, UpdateTimeTableEntryDto } from '../../dtos/timetable/timetable.dto.js';

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.timeTableEntry.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  private timeStringToDate(time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(0);
    date.setUTCHours(hours, minutes, 0, 0);
    return date;
  }

  async create(dto: CreateTimeTableEntryDto) {
    return this.prisma.timeTableEntry.create({
      data: {
        dayOfWeek: dto.dayOfWeek,
        startTime: this.timeStringToDate(dto.startTime),
        endTime: this.timeStringToDate(dto.endTime),
        label: dto.label,
        type: dto.type,
      },
    });
  }

  async update(id: number, dto: UpdateTimeTableEntryDto) {
    return this.prisma.timeTableEntry.update({
      where: { id },
      data: {
        startTime: this.timeStringToDate(dto.startTime),
        endTime: this.timeStringToDate(dto.endTime),
        label: dto.label,
        type: dto.type,
      },
    });
  }

  async remove(id: number) {
    await this.prisma.timeTableEntry.delete({ where: { id } });
  }
}
