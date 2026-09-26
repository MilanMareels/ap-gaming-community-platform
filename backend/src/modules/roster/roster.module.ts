import { Module } from '@nestjs/common';
import { RosterService } from './roster.service.js';
import { RosterController } from './roster.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [RosterController],
  providers: [RosterService],
})
export class RosterModule {}
