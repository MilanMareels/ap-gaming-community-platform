import { Module } from '@nestjs/common';
import { InventoryAdjustmentsService } from './inventory-adjustments.service.js';
import { InventoryAdjustmentsController } from './inventory-adjustments.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [InventoryAdjustmentsController],
  providers: [InventoryAdjustmentsService],
  exports: [InventoryAdjustmentsService],
})
export class InventoryAdjustmentsModule {}
