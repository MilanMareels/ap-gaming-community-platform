import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../modules/auth/public.decorator.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { AUTH_COOKIE_NAME } from '../modules/auth/constants/auth.constants.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token missing');
    }

    const claims = await this.authService.verifyToken(token);
    (request as Request & { user: typeof claims }).user = claims;

    return true;
  }

  private extractToken(request: Request) {
    const bearerToken = this.extractBearerToken(request);
    if (bearerToken) {
      return bearerToken;
    }

    return request.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
  }

  private extractBearerToken(request: Request) {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return undefined;
  }
}
