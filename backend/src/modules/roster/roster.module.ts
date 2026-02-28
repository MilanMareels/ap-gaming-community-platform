import { Module } from '@nestjs/common';
import { RosterService } from './roster.service.js';
import { RosterController } from './roster.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [RosterController],
  providers: [RosterService],
})
export class RosterModule {}
