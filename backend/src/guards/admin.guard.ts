import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { JwtPayload } from '../modules/auth/types/jwt-payload.type.js';
import { IS_PUBLIC_KEY } from '../modules/auth/public.decorator.js';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

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
