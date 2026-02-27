import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import configuration from '../../common/config.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './types/jwt-payload.type.js';
import type { GoogleTokenResponse } from './types/google-token-response.type.js';
import type { GoogleUserInfo } from './types/google-userinfo.type.js';

@Injectable()
export class AuthService {
  private readonly config = configuration();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async buildGoogleLoginUrl(returnUrl?: string) {
    const params = new URLSearchParams({
      client_id: this.config.google.clientId,
      redirect_uri: this.config.google.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    if (returnUrl) {
      params.set('state', returnUrl);
    }

    return `${this.config.google.authUrl}?${params.toString()}`;
  }

  async handleGoogleCallback(code: string) {
    const tokenResponse = await this.exchangeAuthorizationCode(code);
    const googleProfile = await this.fetchGoogleProfile(tokenResponse);

    const user = await this.findLinkedUser(googleProfile);
    if (!user) {
      return { user: null, token: null };
    }

    const token = await this.generateToken(user.id, user.email);

    return { user, token };
  }

  async verifyToken(token: string) {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }

  async getProfileFromToken(token: string) {
    const claims = await this.verifyToken(token);

    const user = await this.prisma.user.findUnique({
      where: { id: claims.sub },
      include: {
        adminUsers: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      sNumber: user.sNumber,
      isAdmin: user.adminUsers.length > 0,
    };
  }

  private async exchangeAuthorizationCode(code: string) {
    const response = await fetch(this.config.google.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: this.config.google.clientId,
        client_secret: this.config.google.clientSecret,
        redirect_uri: this.config.google.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google OAuth response');
    }

    return (await response.json()) as GoogleTokenResponse;
  }

  private async fetchGoogleProfile(tokenResponse: GoogleTokenResponse) {
    if (!tokenResponse.access_token) {
      throw new UnauthorizedException(
        'Google OAuth token did not include access token',
      );
    }

    const response = await fetch(this.config.google.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
      },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to fetch Google user profile');
    }

    const profile = (await response.json()) as GoogleUserInfo;

    if (!profile.sub || !profile.email || profile.email_verified === false) {
      throw new UnauthorizedException('Google profile payload is invalid');
    }

    return profile;
  }

  private async findLinkedUser(profile: GoogleUserInfo) {
    const linkedGoogleUser = await this.prisma.googleSSOUser.findUnique({
      where: { ssoId: profile.sub },
      include: {
        user: true,
      },
    });

    if (linkedGoogleUser?.user) {
      return linkedGoogleUser.user;
    }

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: profile.email,
      },
    });

    if (!existingUser) {
      // Check if this is the first user in the system
      const userCount = await this.prisma.user.count();

      if (userCount === 0) {
        // Create first user and make them admin
        const newUser = await this.prisma.user.create({
          data: {
            email: profile.email,
            sNumber: `sso_${profile.sub.substring(0, 8)}`,
            name: profile.name || profile.email.split('@')[0],
          },
        });

        // Create GoogleSSO link
        await this.prisma.googleSSOUser.create({
          data: {
            ssoId: profile.sub,
            userId: newUser.id,
          },
        });

        // Make this user an admin
        await this.prisma.adminUser.create({
          data: {
            userId: newUser.id,
          },
        });

        return newUser;
      }

      return null;
    }

    await this.prisma.googleSSOUser.create({
      data: {
        ssoId: profile.sub,
        userId: existingUser.id,
      },
    });

    return existingUser;
  }

  private async generateToken(userId: number, email: string) {
    const adminUser = await this.prisma.adminUser.findFirst({
      where: {
        userId,
      },
    });

    const payload: JwtPayload = {
      sub: userId,
      email,
      isAdmin: Boolean(adminUser),
    };

    return this.jwtService.signAsync(payload as Record<string, unknown>, {
      expiresIn: '1d',
    });
  }
}
