import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service.js';
import { JobsController } from './jobs.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
