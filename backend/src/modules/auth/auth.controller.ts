import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import configuration from '../../common/config.js';
import { AuthProfileResponseDto } from '../../dtos/auth/auth-profile-response.dto.js';
import { GoogleAuthUrlResponseDto } from '../../dtos/auth/google-auth-url-response.dto.js';
import { GoogleCallbackQueryDto } from '../../dtos/auth/google-callback-query.dto.js';
import { GoogleLoginQueryDto } from '../../dtos/auth/google-login-query.dto.js';
import { LinkedProvidersResponseDto } from '../../dtos/auth/linked-providers-response.dto.js';
import { LogoutResponseDto } from '../../dtos/auth/logout-response.dto.js';
import { MicrosoftAuthUrlResponseDto } from '../../dtos/auth/microsoft-auth-url-response.dto.js';
import { MicrosoftCallbackQueryDto } from '../../dtos/auth/microsoft-callback-query.dto.js';
import { MicrosoftLoginQueryDto } from '../../dtos/auth/microsoft-login-query.dto.js';
import { MobileHandoffQueryDto, MobileTokenRequestDto, MobileTokenResponseDto } from '../../dtos/auth/mobile-auth.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { AuthService, type SsoProvider } from './auth.service.js';
import {
  AUTH_COOKIE_NAME,
  AUTH_DEFAULT_RETURN_URL,
  AUTH_LEGACY_COOKIE_NAME,
  AUTH_UNKNOWN_USER_PATH,
  MOBILE_APP_CALLBACK_URL,
} from './constants/auth.constants.js';
import { Public } from './public.decorator.js';
import type { JwtPayload } from './types/jwt-payload.type.js';

type LoginQuery = { returnUrl?: string; linkMode?: string };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly config = configuration();

  constructor(private readonly authService: AuthService) {}

  // --------------- Google ---------------

  @Public()
  @Get('google/url')
  @ApiOperation({ summary: 'Get Google login URL' })
  @ApiOkResponse({ type: GoogleAuthUrlResponseDto })
  async googleAuthUrl(@Query() query: GoogleLoginQueryDto): Promise<GoogleAuthUrlResponseDto> {
    return {
      url: await this.authService.buildGoogleLoginUrl({ returnUrl: query.returnUrl }),
    };
  }

  @Public()
  @Get('google/login')
  @ApiOperation({ summary: 'Redirect to Google login page' })
  async googleLogin(@Query() query: GoogleLoginQueryDto & { linkMode?: string }, @Res() res: Response) {
    const url = await this.authService.buildGoogleLoginUrl(this.toState(query));
    return res.redirect(url);
  }

  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback and session creation' })
  async googleCallback(@Query() query: GoogleCallbackQueryDto, @Req() req: Request, @Res() res: Response) {
    const state = this.authService.decodeState(query.state);

    if (state.linkMode) {
      return this.handleLinkCallback('google', query.code, state.returnUrl, req, res);
    }

    const callbackResult = await this.authService.handleGoogleCallback(query.code);

    if (!callbackResult.token) {
      return res.redirect(`${this.config.frontend.url}${AUTH_UNKNOWN_USER_PATH}`);
    }

    this.setAuthCookie(res, callbackResult.token);
    return res.redirect(`${this.config.frontend.url}${state.returnUrl || AUTH_DEFAULT_RETURN_URL}`);
  }

  // --------------- Microsoft ---------------

  @Public()
  @Get('microsoft/url')
  @ApiOperation({ summary: 'Get Microsoft login URL' })
  @ApiOkResponse({ type: MicrosoftAuthUrlResponseDto })
  async microsoftAuthUrl(@Query() query: MicrosoftLoginQueryDto): Promise<MicrosoftAuthUrlResponseDto> {
    return {
      url: await this.authService.buildMicrosoftLoginUrl(this.toState(query)),
    };
  }

  @Public()
  @Get('microsoft/login')
  @ApiOperation({ summary: 'Redirect to Microsoft login page' })
  async microsoftLogin(@Query() query: MicrosoftLoginQueryDto, @Res() res: Response) {
    const url = await this.authService.buildMicrosoftLoginUrl(this.toState(query));
    return res.redirect(url);
  }

  @Public()
  @Get('microsoft/callback')
  @ApiOperation({ summary: 'Microsoft OAuth callback and session creation' })
  async microsoftCallback(@Query() query: MicrosoftCallbackQueryDto, @Req() req: Request, @Res() res: Response) {
    const state = this.authService.decodeState(query.state);

    if (state.linkMode) {
      return this.handleLinkCallback('microsoft', query.code, state.returnUrl, req, res);
    }

    const callbackResult = await this.authService.handleMicrosoftCallback(query.code);

    if (!callbackResult.token) {
      return res.redirect(`${this.config.frontend.url}${AUTH_UNKNOWN_USER_PATH}`);
    }

    this.setAuthCookie(res, callbackResult.token);
    return res.redirect(`${this.config.frontend.url}${state.returnUrl || AUTH_DEFAULT_RETURN_URL}`);
  }

  // --------------- Mobile app ---------------

  @Public()
  @Get('mobile/handoff')
  @ApiOperation({ summary: 'Hand the web session over to the mobile app (sends the user through web login first if needed)' })
  async mobileHandoff(@Query() query: MobileHandoffQueryDto, @Req() req: Request, @Res() res: Response) {
    const token = this.extractToken(req);
    const claims = token ? await this.authService.verifyToken(token).catch(() => undefined) : undefined;

    if (!claims) {
      const returnUrl = `/api/auth/mobile/handoff?challenge=${encodeURIComponent(query.challenge)}`;
      return res.redirect(`${this.config.frontend.url}/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    }

    const code = await this.authService.createMobileHandoffCode(claims, query.challenge);
    return res.redirect(`${MOBILE_APP_CALLBACK_URL}?code=${encodeURIComponent(code)}`);
  }

  @Public()
  @Post('mobile/token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange a mobile handoff code and PKCE verifier for a bearer token' })
  @ApiOkResponse({ type: MobileTokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired login code' })
  async mobileToken(@Body() body: MobileTokenRequestDto): Promise<MobileTokenResponseDto> {
    return { token: await this.authService.exchangeMobileHandoffCode(body.code, body.verifier) };
  }

  // --------------- Link / Unlink ---------------

  @Get('links')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List linked SSO providers for the current user' })
  @ApiOkResponse({ type: LinkedProvidersResponseDto })
  async listLinks(@Req() req: Request): Promise<LinkedProvidersResponseDto> {
    const user = this.requireUser(req);
    return this.authService.getLinkedProviders(user.sub);
  }

  @Delete('links/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unlink an SSO provider from the current user' })
  @ApiOkResponse({ type: LinkedProvidersResponseDto })
  async unlinkProvider(@Param('provider') provider: string, @Req() req: Request): Promise<LinkedProvidersResponseDto> {
    const user = this.requireUser(req);
    const normalized = this.parseProvider(provider);
    return this.authService.unlinkProvider(normalized, user.sub);
  }

  // --------------- Impersonation ---------------

  @Post('impersonate/user/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Impersonate a user (Admin only)' })
  async impersonateUser(@Param('id') id: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = this.requireUser(req);
    const realUserId = user.realUserId ?? user.sub;
    const token = await this.authService.impersonateUser(realUserId, +id);
    this.setAuthCookie(res, token);
    return { success: true };
  }

  @Post('impersonate/role/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Impersonate a role (Admin only)' })
  async impersonateRole(@Param('id') id: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = this.requireUser(req);
    const realUserId = user.realUserId ?? user.sub;
    const token = await this.authService.impersonateRole(realUserId, +id);
    this.setAuthCookie(res, token);
    return { success: true };
  }

  @Post('impersonate/stop')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Stop impersonating and revert to real user' })
  async stopImpersonation(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = this.requireUser(req);
    const token = await this.authService.stopImpersonation(user);
    this.setAuthCookie(res, token);
    return { success: true };
  }

  // --------------- Session ---------------

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Clear auth cookie and logout' })
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(@Res({ passthrough: true }) res: Response): LogoutResponseDto {
    this.clearAuthCookies(res);
    return { success: true };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get profile of authenticated user' })
  @ApiOkResponse({ type: AuthProfileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async profile(@Req() req: Request): Promise<AuthProfileResponseDto> {
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.authService.getProfileFromToken(token);
  }

  // --------------- Helpers ---------------

  private toState(query: LoginQuery) {
    return {
      returnUrl: query.returnUrl,
      linkMode: query.linkMode === 'true',
    };
  }

  private async handleLinkCallback(provider: SsoProvider, code: string, returnUrl: string | undefined, req: Request, res: Response) {
    const token = this.extractToken(req);
    if (!token) {
      // User isn't logged in; can't link. Fall back to normal login flow.
      return res.redirect(`${this.config.frontend.url}/login?linkError=not-authenticated`);
    }

    let claims: JwtPayload;
    try {
      claims = await this.authService.verifyToken(token);
    } catch {
      return res.redirect(`${this.config.frontend.url}/login?linkError=session-expired`);
    }

    try {
      if (provider === 'google') {
        await this.authService.linkGoogleAccount(claims.sub, code);
      } else {
        await this.authService.linkMicrosoftAccount(claims.sub, code);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'link-failed';
      const safe = encodeURIComponent(message.slice(0, 200));
      return res.redirect(`${this.config.frontend.url}${returnUrl || '/admin/settings'}?linkError=${safe}`);
    }

    return res.redirect(`${this.config.frontend.url}${returnUrl || '/admin/settings'}?linked=${provider}`);
  }

  private parseProvider(value: string): SsoProvider {
    if (value === 'google' || value === 'microsoft') return value;
    throw new BadRequestException('Unknown SSO provider');
  }

  private requireUser(req: Request): JwtPayload {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException('Unauthorized');
    return user;
  }

  // Same precedence as JwtAuthGuard: the web uses the cookie, the mobile app sends a bearer token
  private extractToken(req: Request): string | undefined {
    const cookieToken = (req.cookies?.[AUTH_COOKIE_NAME] as string | undefined) || (req.cookies?.[AUTH_LEGACY_COOKIE_NAME] as string | undefined);
    if (cookieToken) return cookieToken;

    const authHeader = req.headers.authorization;
    return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  }

  private setAuthCookie(res: Response, token: string) {
    this.clearAuthCookies(res);
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: this.config.auth.cookieMaxAgeMs,
    });
  }

  private clearAuthCookies(res: Response) {
    const cookieNames = [AUTH_COOKIE_NAME, AUTH_LEGACY_COOKIE_NAME];
    const cookiePaths = ['/', '/api'];

    for (const cookieName of cookieNames) {
      for (const path of cookiePaths) {
        res.clearCookie(cookieName, {
          httpOnly: true,
          secure: this.config.nodeEnv === 'production',
          sameSite: 'lax',
          path,
        });
      }
    }
  }
}
