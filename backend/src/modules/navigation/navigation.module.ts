import { Module } from '@nestjs/common';
import { NavigationService } from './navigation.service.js';
import { NavigationController } from './navigation.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [NavigationController],
  providers: [NavigationService],
})
export class NavigationModule {}
