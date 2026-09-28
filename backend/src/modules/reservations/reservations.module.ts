import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service.js';
import { ReservationsController } from './reservations.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { MailModule } from '../mail/mail.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { InventoryAdjustmentsModule } from '../inventory-adjustments/inventory-adjustments.module.js';

@Module({
  imports: [AuthModule, RbacModule, MailModule, InventoryAdjustmentsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
