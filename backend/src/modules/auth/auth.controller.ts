import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import configuration from '../../common/config.js';
import { AuthProfileResponseDto } from '../../dtos/auth/auth-profile-response.dto.js';
import { GoogleAuthUrlResponseDto } from '../../dtos/auth/google-auth-url-response.dto.js';
import { GoogleCallbackQueryDto } from '../../dtos/auth/google-callback-query.dto.js';
import { GoogleLoginQueryDto } from '../../dtos/auth/google-login-query.dto.js';
import { LogoutResponseDto } from '../../dtos/auth/logout-response.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { AuthService } from './auth.service.js';
import {
  AUTH_COOKIE_NAME,
  AUTH_DEFAULT_RETURN_URL,
  AUTH_UNKNOWN_USER_PATH,
} from './constants/auth.constants.js';
import { Public } from './public.decorator.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly config = configuration();

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('google/url')
  @ApiOperation({ summary: 'Get Google login URL' })
  @ApiOkResponse({ type: GoogleAuthUrlResponseDto })
  async googleAuthUrl(
    @Query() query: GoogleLoginQueryDto,
  ): Promise<GoogleAuthUrlResponseDto> {
    return {
      url: await this.authService.buildGoogleLoginUrl(query.returnUrl),
    };
  }

  @Public()
  @Get('google/login')
  @ApiOperation({ summary: 'Redirect to Google login page' })
  async googleLogin(@Query() query: GoogleLoginQueryDto, @Res() res: Response) {
    const url = await this.authService.buildGoogleLoginUrl(query.returnUrl);
    return res.redirect(url);
  }

  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback and session creation' })
  async googleCallback(
    @Query() query: GoogleCallbackQueryDto,
    @Res() res: Response,
  ) {
    const callbackResult = await this.authService.handleGoogleCallback(
      query.code,
    );

    if (!callbackResult.token) {
      return res.redirect(
        `${this.config.frontend.url}${AUTH_UNKNOWN_USER_PATH}`,
      );
    }

    res.cookie(AUTH_COOKIE_NAME, callbackResult.token, {
      httpOnly: true,
      secure: this.config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: this.config.auth.cookieMaxAgeMs,
    });

    const returnPath = query.state || AUTH_DEFAULT_RETURN_URL;
    return res.redirect(`${this.config.frontend.url}${returnPath}`);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Clear auth cookie and logout' })
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(@Res({ passthrough: true }) res: Response): LogoutResponseDto {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { success: true };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get profile of authenticated user' })
  @ApiOkResponse({ type: AuthProfileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async profile(@Req() req: Request): Promise<AuthProfileResponseDto> {
    const token = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.authService.getProfileFromToken(token);
  }
}
