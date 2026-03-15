import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { ReservationsModule } from './modules/reservations/reservations.module.js';
import { RosterModule } from './modules/roster/roster.module.js';
import { TimetableModule } from './modules/timetable/timetable.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { EventsModule } from './modules/events/events.module.js';

@Module({
  imports: [PrismaModule, AuthModule, ReservationsModule, RosterModule, TimetableModule, SettingsModule, EventsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
