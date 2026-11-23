import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { MailModule } from '../mail/mail.module.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [AuthModule, RbacModule, MailModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
