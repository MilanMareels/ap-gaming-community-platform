import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import configuration from '../common/config.js';
import { IS_PUBLIC_KEY } from '../modules/auth/public.decorator.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { AUTH_COOKIE_NAME, AUTH_LEGACY_COOKIE_NAME } from '../modules/auth/constants/auth.constants.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private static secretFingerprintLogged = false;
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly config = configuration();

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {
    if (!JwtAuthGuard.secretFingerprintLogged) {
      this.logger.log(`JWT secret fingerprint: ${this.getSecretFingerprint()}`);
      JwtAuthGuard.secretFingerprintLogged = true;
    }
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const extractedToken = this.extractToken(request);
    const token = extractedToken.token;

    if (extractedToken.hasCookie && extractedToken.hasBearer && extractedToken.cookieToken !== extractedToken.bearerToken) {
      this.logger.warn('Cookie token and bearer token are both present but differ; cookie token will be used');
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token missing');
    }

    let claims;
    try {
      claims = await this.authService.verifyToken(token);
    } catch (error) {
      const tokenMeta = this.getTokenMeta(token);
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `JWT verification failed: source=${extractedToken.source} hasCookie=${extractedToken.hasCookie} hasBearer=${extractedToken.hasBearer} error=${errorName}: ${errorMessage} tokenMeta=${JSON.stringify(tokenMeta)}`,
      );

      const response = context.switchToHttp().getResponse<Response>();
      this.clearAuthCookies(response);
      throw new UnauthorizedException('Invalid or expired authentication token');
    }

    (request as Request & { user: typeof claims }).user = claims;

    return true;
  }

  private extractToken(request: Request) {
    const cookieToken =
      (request.cookies?.[AUTH_COOKIE_NAME] as string | undefined) || (request.cookies?.[AUTH_LEGACY_COOKIE_NAME] as string | undefined);
    const bearerToken = this.extractBearerToken(request);

    if (cookieToken) {
      return {
        token: cookieToken,
        source: 'cookie' as const,
        hasCookie: true,
        hasBearer: Boolean(bearerToken),
        cookieToken,
        bearerToken,
      };
    }

    if (bearerToken) {
      return {
        token: bearerToken,
        source: 'bearer' as const,
        hasCookie: false,
        hasBearer: true,
        cookieToken,
        bearerToken,
      };
    }

    return {
      token: undefined,
      source: 'none' as const,
      hasCookie: false,
      hasBearer: false,
      cookieToken,
      bearerToken,
    };
  }

  private extractBearerToken(request: Request) {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return undefined;
  }

  private getTokenMeta(token: string) {
    try {
      const [headerPart, payloadPart] = token.split('.');

      const header = headerPart ? JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8')) : undefined;
      const payload = payloadPart ? JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) : undefined;

      return {
        alg: typeof header?.alg === 'string' ? header.alg : undefined,
        typ: typeof header?.typ === 'string' ? header.typ : undefined,
        kid: typeof header?.kid === 'string' ? header.kid : undefined,
        iss: typeof payload?.iss === 'string' ? payload.iss : undefined,
        sub: typeof payload?.sub === 'string' || typeof payload?.sub === 'number' ? payload.sub : undefined,
        iat: typeof payload?.iat === 'number' ? payload.iat : undefined,
        exp: typeof payload?.exp === 'number' ? payload.exp : undefined,
        tokenLength: token.length,
      };
    } catch {
      return {
        parseError: true,
        tokenLength: token.length,
      };
    }
  }

  private getSecretFingerprint() {
    return createHash('sha256').update(this.config.jwt.secret).digest('hex').slice(0, 12);
  }

  private clearAuthCookies(response: Response) {
    const cookieNames = [AUTH_COOKIE_NAME, AUTH_LEGACY_COOKIE_NAME];
    const cookiePaths = ['/', '/api'];

    for (const cookieName of cookieNames) {
      for (const path of cookiePaths) {
        response.clearCookie(cookieName, {
          httpOnly: true,
          secure: this.config.nodeEnv === 'production',
          sameSite: 'lax',
          path,
        });
      }
    }
  }
}
