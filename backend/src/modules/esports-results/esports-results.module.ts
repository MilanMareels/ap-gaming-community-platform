import { Module } from '@nestjs/common';
import { EsportsResultsService } from './esports-results.service.js';
import { EsportsResultsController } from './esports-results.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [EsportsResultsController],
  providers: [EsportsResultsService],
})
export class EsportsResultsModule {}
