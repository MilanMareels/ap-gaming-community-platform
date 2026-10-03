import { Module } from '@nestjs/common';
import { SpeedrunGamesService } from './speedrun-games.service.js';
import { SpeedrunRunsService } from './speedrun-runs.service.js';
import { SpeedrunGamesController } from './speedrun-games.controller.js';
import { SpeedrunRunsController } from './speedrun-runs.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [SpeedrunGamesController, SpeedrunRunsController],
  providers: [SpeedrunGamesService, SpeedrunRunsService],
})
export class SpeedrunsModule {}
