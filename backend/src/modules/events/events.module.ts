import { Module } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { EventRegistrationsService } from './event-registrations.service.js';
import { EventsController } from './events.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [EventsController],
  providers: [EventsService, EventRegistrationsService],
})
export class EventsModule {}
