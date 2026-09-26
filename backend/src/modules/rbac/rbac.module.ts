import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service.js';
import { RbacAdminService } from './rbac-admin.service.js';
import { RbacController } from './rbac.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [RbacController],
  providers: [RbacService, RbacAdminService],
  exports: [RbacService],
})
export class RbacModule {}
