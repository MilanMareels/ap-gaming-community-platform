import { Module } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { EventRegistrationsService } from './event-registrations.service.js';
import { EventsController } from './events.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [EventsController],
  providers: [EventsService, EventRegistrationsService],
})
export class EventsModule {}
