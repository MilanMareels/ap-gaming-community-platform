import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateNavLinkDto, ReorderNavLinksDto, UpdateNavLinkDto } from '../../dtos/navigation/navigation.dto.js';

@Injectable()
export class NavigationService {
  constructor(private readonly prisma: PrismaService) {}

  async getNavTree() {
    return this.prisma.navLink.findMany({
      where: { parentId: null },
      orderBy: { position: 'asc' },
      include: {
        children: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async getAllFlat() {
    return this.prisma.navLink.findMany({
      orderBy: [{ parentId: 'asc' }, { position: 'asc' }],
    });
  }

  async create(dto: CreateNavLinkDto) {
    if (dto.parentId != null) {
      const parent = await this.prisma.navLink.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Parent nav link not found');
      if (parent.parentId != null) throw new BadRequestException('Cannot nest deeper than one level');
    }

    if (dto.isCta && dto.parentId != null) {
      throw new BadRequestException('CTA items must be top-level');
    }

    return this.prisma.navLink.create({
      data: {
        label: dto.label,
        href: dto.href ?? null,
        icon: dto.icon ?? null,
        parentId: dto.parentId ?? null,
        position: dto.position,
        visibility: dto.visibility ?? 'public',
        isCta: dto.isCta ?? false,
        openInNewTab: dto.openInNewTab ?? false,
      },
    });
  }

  async update(id: number, dto: UpdateNavLinkDto) {
    const existing = await this.prisma.navLink.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Nav link not found');

    if (dto.parentId !== undefined && dto.parentId != null) {
      const parent = await this.prisma.navLink.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Parent nav link not found');
      if (parent.parentId != null) throw new BadRequestException('Cannot nest deeper than one level');
    }

    const isCta = dto.isCta ?? existing.isCta;
    const parentId = dto.parentId !== undefined ? dto.parentId : existing.parentId;
    if (isCta && parentId != null) {
      throw new BadRequestException('CTA items must be top-level');
    }

    const data: Record<string, unknown> = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.href !== undefined) data.href = dto.href;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.parentId !== undefined) data.parentId = dto.parentId;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.isCta !== undefined) data.isCta = dto.isCta;
    if (dto.openInNewTab !== undefined) data.openInNewTab = dto.openInNewTab;

    return this.prisma.navLink.update({ where: { id }, data });
  }

  async delete(id: number) {
    const existing = await this.prisma.navLink.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Nav link not found');
    if (existing.isProtected) throw new BadRequestException('Cannot delete a protected nav link');
    await this.prisma.navLink.delete({ where: { id } });
  }

  async reorder(dto: ReorderNavLinksDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.navLink.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    );
  }
}
