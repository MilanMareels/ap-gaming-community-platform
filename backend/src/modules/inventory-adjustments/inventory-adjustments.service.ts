import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateInventoryAdjustmentDto,
  UpdateInventoryAdjustmentDto,
  InventoryAdjustmentQueryDto,
} from '../../dtos/inventory-adjustments/inventory-adjustment.dto.js';

@Injectable()
export class InventoryAdjustmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInventoryAdjustmentDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }

    if (dto.quantity === 0) {
      throw new BadRequestException('quantity must not be zero');
    }

    return this.prisma.inventoryAdjustment.create({
      data: {
        inventory: dto.inventory,
        quantity: dto.quantity,
        startTime,
        endTime,
        reason: dto.reason,
      },
    });
  }

  async findAll(query: InventoryAdjustmentQueryDto) {
    const where: any = {};

    if (query.inventory) {
      where.inventory = query.inventory;
    }

    if (query.date) {
      const startOfDay = new Date(query.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(query.date);
      endOfDay.setHours(23, 59, 59, 999);

      where.startTime = { lt: endOfDay };
      where.endTime = { gt: startOfDay };
    }

    return this.prisma.inventoryAdjustment.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: number) {
    const adjustment = await this.prisma.inventoryAdjustment.findUnique({
      where: { id },
    });

    if (!adjustment) {
      throw new NotFoundException('Inventory adjustment not found');
    }

    return adjustment;
  }

  async update(id: number, dto: UpdateInventoryAdjustmentDto) {
    await this.findOne(id);

    const data: any = {};
    if (dto.inventory !== undefined) data.inventory = dto.inventory;
    if (dto.quantity !== undefined) {
      if (dto.quantity === 0) {
        throw new BadRequestException('quantity must not be zero');
      }
      data.quantity = dto.quantity;
    }
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = new Date(dto.endTime);
    if (dto.reason !== undefined) data.reason = dto.reason;

    // Validate time range if either time field is being updated
    if (data.startTime || data.endTime) {
      const existing = await this.findOne(id);
      const startTime = data.startTime || existing.startTime;
      const endTime = data.endTime || existing.endTime;
      if (startTime >= endTime) {
        throw new BadRequestException('startTime must be before endTime');
      }
    }

    return this.prisma.inventoryAdjustment.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.inventoryAdjustment.delete({ where: { id } });
  }

  /**
   * Returns the net capacity adjustment for a given inventory type and time range.
   * Used by the reservation service to compute effective capacity.
   */
  async getEffectiveAdjustment(inventory: string, startTime: Date, endTime: Date): Promise<number> {
    const adjustments = await this.prisma.inventoryAdjustment.findMany({
      where: {
        inventory,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    return adjustments.reduce((sum, adj) => sum + adj.quantity, 0);
  }

  /**
   * Returns slim adjustment data for a given date.
   * Used by the public slots endpoint for frontend availability calculation.
   */
  async getAdjustmentsForDate(date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.inventoryAdjustment.findMany({
      where: {
        startTime: { lt: endOfDay },
        endTime: { gt: startOfDay },
      },
      select: {
        inventory: true,
        quantity: true,
        startTime: true,
        endTime: true,
      },
    });
  }
}
