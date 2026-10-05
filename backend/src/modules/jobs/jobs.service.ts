import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateJobDto, UpdateJobDto } from '../../dtos/jobs/job.dto.js';
import sanitizeHtml from 'sanitize-html';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['h2', 'h3', 'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
};

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive() {
    return this.prisma.job.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        form: { select: { id: true, cuid: true, title: true } },
      },
    });
  }

  async findAll() {
    return this.prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        form: { select: { id: true, cuid: true, title: true } },
      },
    });
  }

  async findActiveById(id: number) {
    const job = await this.prisma.job.findFirst({
      where: { id, isActive: true },
      include: {
        form: { select: { id: true, cuid: true, title: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async findById(id: number) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        form: { select: { id: true, cuid: true, title: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async create(dto: CreateJobDto) {
    return this.prisma.job.create({
      data: {
        title: dto.title,
        shortDescription: dto.shortDescription ?? '',
        description: sanitizeHtml(dto.description, SANITIZE_OPTIONS),
        isActive: dto.isActive ?? true,
        formId: dto.formId ?? null,
      },
    });
  }

  async update(id: number, dto: UpdateJobDto) {
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.shortDescription !== undefined) data.shortDescription = dto.shortDescription;
    if (dto.description !== undefined) data.description = sanitizeHtml(dto.description, SANITIZE_OPTIONS);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.formId !== undefined) data.formId = dto.formId;

    return this.prisma.job.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    await this.prisma.job.delete({ where: { id } });
  }
}
