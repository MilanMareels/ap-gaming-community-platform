import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import configuration from '../../common/config.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

const config = configuration();

@Module({
  imports: [
    JwtModule.register({
      secret: config.jwt.secret,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
