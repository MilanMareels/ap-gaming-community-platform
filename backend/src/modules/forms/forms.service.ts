import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateFormDto, UpdateFormDto } from '../../dtos/forms/form.dto.js';
import { CreateFormFieldDto, UpdateFormFieldDto, ReorderFormFieldsDto } from '../../dtos/forms/form-field.dto.js';

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.dynamicForm.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { submissions: true, fields: true } },
      },
    });
  }

  async findById(id: number) {
    const form = await this.prisma.dynamicForm.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { position: 'asc' } },
        _count: { select: { submissions: true } },
      },
    });
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async findByCuid(cuid: string) {
    const form = await this.prisma.dynamicForm.findUnique({
      where: { cuid },
      include: {
        fields: { orderBy: { position: 'asc' } },
      },
    });
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async create(dto: CreateFormDto) {
    return this.prisma.dynamicForm.create({
      data: {
        title: dto.title,
        description: dto.description,
        requiresAuth: dto.requiresAuth ?? false,
        confirmationEmail: dto.confirmationEmail ?? true,
        discordWebhookUrl: dto.discordWebhookUrl,
      },
    });
  }

  async update(id: number, dto: UpdateFormDto) {
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.requiresAuth !== undefined) data.requiresAuth = dto.requiresAuth;
    if (dto.confirmationEmail !== undefined) data.confirmationEmail = dto.confirmationEmail;
    if (dto.discordWebhookUrl !== undefined) data.discordWebhookUrl = dto.discordWebhookUrl;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.dynamicForm.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    await this.prisma.dynamicForm.delete({ where: { id } });
  }

  // --- Field operations ---

  async createField(formId: number, dto: CreateFormFieldDto) {
    await this.ensureFormExists(formId);
    return this.prisma.dynamicFormField.create({
      data: {
        formId,
        type: dto.type,
        label: dto.label,
        required: dto.required ?? false,
        position: dto.position,
        config: dto.config ?? undefined,
      },
    });
  }

  async updateField(formId: number, fieldId: number, dto: UpdateFormFieldDto) {
    await this.ensureFormExists(formId);
    const data: Record<string, unknown> = {};
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.required !== undefined) data.required = dto.required;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.config !== undefined) data.config = dto.config;

    return this.prisma.dynamicFormField.update({
      where: { id: fieldId },
      data,
    });
  }

  async deleteField(formId: number, fieldId: number) {
    await this.ensureFormExists(formId);
    await this.prisma.dynamicFormField.delete({ where: { id: fieldId } });
  }

  async reorderFields(formId: number, dto: ReorderFormFieldsDto) {
    await this.ensureFormExists(formId);
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.dynamicFormField.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );
  }

  /** Get all active forms as a simple list (for job form selector) */
  async findAllSimple() {
    return this.prisma.dynamicForm.findMany({
      where: { isActive: true },
      select: { id: true, title: true, cuid: true },
      orderBy: { title: 'asc' },
    });
  }

  private async ensureFormExists(id: number) {
    const form = await this.prisma.dynamicForm.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('Form not found');
  }
}
