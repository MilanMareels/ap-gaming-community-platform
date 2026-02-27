import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../modules/auth/types/jwt-payload.type.js';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();

    if (!request.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!request.user.isAdmin) {
      throw new UnauthorizedException('Access denied. ADMIN access required');
    }

    return true;
  }
}
