import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import configuration from '../../common/config.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './types/jwt-payload.type.js';
import type { GoogleTokenResponse } from './types/google-token-response.type.js';
import type { GoogleUserInfo } from './types/google-userinfo.type.js';
import type { MicrosoftTokenResponse } from './types/microsoft-token-response.type.js';
import type { MicrosoftUserInfo } from './types/microsoft-userinfo.type.js';

export type SsoProvider = 'google' | 'microsoft';

export type OAuthState = {
  returnUrl?: string;
  linkMode?: boolean;
};

@Injectable()
export class AuthService {
  private readonly config = configuration();
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  encodeState(state: OAuthState): string | undefined {
    if (!state.returnUrl && !state.linkMode) return undefined;
    return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
  }

  decodeState(raw?: string): OAuthState {
    if (!raw) return {};
    try {
      const decoded = Buffer.from(raw, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as OAuthState;
      return {
        returnUrl: typeof parsed.returnUrl === 'string' ? parsed.returnUrl : undefined,
        linkMode: Boolean(parsed.linkMode),
      };
    } catch {
      // Legacy / plain-string state: treat as returnUrl
      return { returnUrl: raw };
    }
  }

  async buildGoogleLoginUrl(state: OAuthState = {}) {
    const params = new URLSearchParams({
      client_id: this.config.google.clientId,
      redirect_uri: this.config.google.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    const encoded = this.encodeState(state);
    if (encoded) params.set('state', encoded);

    return `${this.config.google.authUrl}?${params.toString()}`;
  }

  async buildMicrosoftLoginUrl(state: OAuthState = {}) {
    const params = new URLSearchParams({
      client_id: this.config.microsoft.clientId,
      redirect_uri: this.config.microsoft.redirectUri,
      response_type: 'code',
      response_mode: 'query',
      scope: 'openid email profile User.Read offline_access',
      prompt: 'select_account',
    });

    const encoded = this.encodeState(state);
    if (encoded) params.set('state', encoded);

    return `${this.config.microsoft.authUrl}?${params.toString()}`;
  }

  async handleGoogleCallback(code: string) {
    const tokenResponse = await this.exchangeGoogleAuthorizationCode(code);
    const profile = await this.fetchGoogleProfile(tokenResponse);

    const user = await this.findOrCreateUserFromGoogle(profile);
    if (!user) {
      return { user: null, token: null };
    }

    const token = await this.generateToken(user.id, user.email);
    return { user, token };
  }

  async handleMicrosoftCallback(code: string) {
    const tokenResponse = await this.exchangeMicrosoftAuthorizationCode(code);
    const profile = await this.fetchMicrosoftProfile(tokenResponse);

    const user = await this.findOrCreateUserFromMicrosoft(profile);
    if (!user) {
      return { user: null, token: null };
    }

    const token = await this.generateToken(user.id, user.email);
    return { user, token, profile };
  }

  async linkGoogleAccount(currentUserId: number, code: string) {
    const tokenResponse = await this.exchangeGoogleAuthorizationCode(code);
    const profile = await this.fetchGoogleProfile(tokenResponse);
    return this.linkSsoToUser('google', currentUserId, profile.sub, profile.email);
  }

  async linkMicrosoftAccount(currentUserId: number, code: string) {
    const tokenResponse = await this.exchangeMicrosoftAuthorizationCode(code);
    const profile = await this.fetchMicrosoftProfile(tokenResponse);
    const result = await this.linkSsoToUser('microsoft', currentUserId, profile.id, this.pickMicrosoftEmail(profile));
    // Microsoft is the canonical identity source — refresh the user's email/name/sNumber from it.
    await this.applyMicrosoftProfile(currentUserId, profile);
    return result;
  }

  async unlinkProvider(provider: SsoProvider, currentUserId: number) {
    const links = await this.countUserLinks(currentUserId);
    if (links.total <= 1) {
      throw new BadRequestException('Cannot unlink your only sign-in provider');
    }

    if (provider === 'google') {
      await this.prisma.googleSSOUser.deleteMany({ where: { userId: currentUserId } });
    } else {
      await this.prisma.microsoftSSOUser.deleteMany({ where: { userId: currentUserId } });
    }

    return this.getLinkedProviders(currentUserId);
  }

  async getLinkedProviders(userId: number) {
    const [google, microsoft] = await Promise.all([
      this.prisma.googleSSOUser.findMany({ where: { userId }, select: { id: true, ssoId: true } }),
      this.prisma.microsoftSSOUser.findMany({ where: { userId }, select: { id: true, ssoId: true } }),
    ]);

    return { google, microsoft };
  }

  async verifyToken(token: string) {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }

  async getProfileFromToken(token: string) {
    const claims = await this.verifyToken(token);

    const user = await this.prisma.user.findUnique({
      where: { id: claims.sub },
      include: { adminUsers: true },
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

  // --------------- Google internals ---------------

  private async exchangeGoogleAuthorizationCode(code: string) {
    const response = await fetch(this.config.google.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
      throw new UnauthorizedException('Google OAuth token did not include access token');
    }

    const response = await fetch(this.config.google.userInfoUrl, {
      headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
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

  private async findOrCreateUserFromGoogle(profile: GoogleUserInfo) {
    const linkedGoogleUser = await this.prisma.googleSSOUser.findUnique({
      where: { ssoId: profile.sub },
      include: { user: true },
    });

    if (linkedGoogleUser?.user) {
      await this.applyGoogleProfile(linkedGoogleUser.user.id, profile);
      return linkedGoogleUser.user;
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingUser) {
      await this.prisma.googleSSOUser.create({
        data: { ssoId: profile.sub, userId: existingUser.id },
      });
      await this.applyGoogleProfile(existingUser.id, profile);
      return existingUser;
    }

    const whitelisted = await this.consumeAdminWhitelist(profile.email);
    if (whitelisted) {
      await this.prisma.googleSSOUser.create({
        data: { ssoId: profile.sub, userId: whitelisted.id },
      });
      await this.applyGoogleProfile(whitelisted.id, profile);
      return whitelisted;
    }

    const firstUser = await this.maybeCreateFirstAdmin({
      email: profile.email,
      name: profile.name || profile.email.split('@')[0],
      sNumberFallback: `sso_${profile.sub.substring(0, 8)}`,
    });

    if (firstUser) {
      await this.prisma.googleSSOUser.create({
        data: { ssoId: profile.sub, userId: firstUser.id },
      });
      return firstUser;
    }

    return null;
  }

  // --------------- Microsoft internals ---------------

  private async exchangeMicrosoftAuthorizationCode(code: string) {
    const response = await fetch(this.config.microsoft.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.microsoft.clientId,
        client_secret: this.config.microsoft.clientSecret,
        redirect_uri: this.config.microsoft.redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid email profile User.Read offline_access',
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.warn(`Microsoft token exchange failed: ${response.status} ${text}`);
      throw new UnauthorizedException('Invalid Microsoft OAuth response');
    }

    return (await response.json()) as MicrosoftTokenResponse;
  }

  private async fetchMicrosoftProfile(tokenResponse: MicrosoftTokenResponse) {
    if (!tokenResponse.access_token) {
      throw new UnauthorizedException('Microsoft OAuth token did not include access token');
    }

    const response = await fetch(this.config.microsoft.graphMeUrl, {
      headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to fetch Microsoft user profile');
    }

    const profile = (await response.json()) as MicrosoftUserInfo;

    if (!profile.id) {
      throw new UnauthorizedException('Microsoft profile payload missing oid');
    }

    return profile;
  }

  private async findOrCreateUserFromMicrosoft(profile: MicrosoftUserInfo) {
    const email = this.pickMicrosoftEmail(profile);
    if (!email) {
      throw new UnauthorizedException('Microsoft profile did not include a usable email');
    }

    const linkedMicrosoftUser = await this.prisma.microsoftSSOUser.findUnique({
      where: { ssoId: profile.id },
      include: { user: true },
    });

    const name = this.buildName(profile);

    if (linkedMicrosoftUser?.user) {
      const refreshed = await this.applyMicrosoftProfile(linkedMicrosoftUser.user.id, profile);
      return refreshed ?? linkedMicrosoftUser.user;
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      await this.prisma.microsoftSSOUser.create({
        data: { ssoId: profile.id, userId: existingUser.id },
      });
      const refreshed = await this.applyMicrosoftProfile(existingUser.id, profile);
      return refreshed ?? existingUser;
    }

    const whitelisted = await this.consumeAdminWhitelist(email);
    if (whitelisted) {
      await this.prisma.microsoftSSOUser.create({
        data: { ssoId: profile.id, userId: whitelisted.id },
      });
      const refreshed = await this.applyMicrosoftProfile(whitelisted.id, profile);
      return refreshed ?? whitelisted;
    }

    // Microsoft sign-in always allows user creation (this is the reservation entry point).
    const sNumber = this.extractSNumber(email, profile.userPrincipalName) || `msft_${profile.id.substring(0, 8)}`;

    const newUser = await this.prisma.user.create({
      data: { email, name, sNumber },
    });

    await this.prisma.microsoftSSOUser.create({
      data: { ssoId: profile.id, userId: newUser.id },
    });

    // Keep parity with Google: first user becomes admin.
    const adminCount = await this.prisma.adminUser.count();
    if (adminCount === 0) {
      await this.prisma.adminUser.create({ data: { userId: newUser.id } });
    }

    return newUser;
  }

  private pickMicrosoftEmail(profile: MicrosoftUserInfo): string {
    const email = (profile.mail || profile.userPrincipalName || '').toLowerCase().trim();
    return email;
  }

  private buildName(profile: MicrosoftUserInfo): string | null {
    if (profile.givenName || profile.surname) {
      return [profile.givenName, profile.surname].filter(Boolean).join(' ').trim() || null;
    }
    return profile.displayName?.trim() || null;
  }

  private extractSNumber(email: string, upn?: string): string | null {
    const candidates = [email, upn].filter((c): c is string => Boolean(c));
    for (const candidate of candidates) {
      const match = candidate.toLowerCase().match(/^(s\d+)@/);
      if (match) return match[1];
    }
    return null;
  }

  // --------------- Shared helpers ---------------

  private async linkSsoToUser(provider: SsoProvider, currentUserId: number, ssoId: string, email: string) {
    const existing =
      provider === 'google'
        ? await this.prisma.googleSSOUser.findUnique({ where: { ssoId }, select: { userId: true } })
        : await this.prisma.microsoftSSOUser.findUnique({ where: { ssoId }, select: { userId: true } });

    if (existing) {
      if (existing.userId === currentUserId) {
        return this.getLinkedProviders(currentUserId);
      }
      throw new ConflictException('This account is already linked to another user');
    }

    if (provider === 'google') {
      await this.prisma.googleSSOUser.create({ data: { ssoId, userId: currentUserId } });
    } else {
      await this.prisma.microsoftSSOUser.create({ data: { ssoId, userId: currentUserId } });
    }

    // If the SSO's email differs from the current user's email, leave the User row untouched —
    // the existing email is the canonical one. Just record the linkage.
    this.logger.log(`Linked ${provider} (${email}) to user ${currentUserId}`);

    return this.getLinkedProviders(currentUserId);
  }

  private async countUserLinks(userId: number) {
    const [google, microsoft] = await Promise.all([
      this.prisma.googleSSOUser.count({ where: { userId } }),
      this.prisma.microsoftSSOUser.count({ where: { userId } }),
    ]);
    return { google, microsoft, total: google + microsoft };
  }

  /**
   * Microsoft is the preferred identity source: when a user signs in via Microsoft,
   * overwrite name, email and sNumber with what Microsoft says. The Microsoft sNumber-bearing
   * UPN is the source of truth.
   */
  private async applyMicrosoftProfile(userId: number, profile: MicrosoftUserInfo) {
    const data: { name?: string; email?: string; sNumber?: string } = {};

    const name = this.buildName(profile);
    if (name) data.name = name;

    const email = this.pickMicrosoftEmail(profile);
    if (email) data.email = email;

    const sNumber = this.extractSNumber(email, profile.userPrincipalName);
    if (sNumber) data.sNumber = sNumber;

    if (Object.keys(data).length === 0) return null;

    try {
      return await this.prisma.user.update({ where: { id: userId }, data });
    } catch (error) {
      // Email uniqueness conflict (Microsoft email collides with another User).
      // Don't fail the sign-in — keep stale email rather than crashing.
      this.logger.warn(`Failed to apply Microsoft profile to user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Google is the fallback identity source: only update profile fields if the user has
   * no Microsoft link (because Microsoft owns the canonical email/name/sNumber when present).
   */
  private async applyGoogleProfile(userId: number, profile: GoogleUserInfo) {
    const hasMicrosoft = (await this.prisma.microsoftSSOUser.count({ where: { userId } })) > 0;
    if (hasMicrosoft) return;

    const data: { name?: string; email?: string } = {};

    const name = profile.name?.trim();
    if (name) data.name = name;

    if (profile.email) data.email = profile.email.toLowerCase();

    if (Object.keys(data).length === 0) return;

    try {
      await this.prisma.user.update({ where: { id: userId }, data });
    } catch (error) {
      this.logger.warn(`Failed to apply Google profile to user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async consumeAdminWhitelist(email: string) {
    const whitelistKey = `admin_whitelist.${email.toLowerCase()}`;
    const whitelist = await this.prisma.setting.findUnique({ where: { key: whitelistKey } });
    if (!whitelist) return null;

    const userId = Number(whitelist.value);
    if (!Number.isFinite(userId)) return null;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    await this.prisma.setting.delete({ where: { key: whitelistKey } });
    return user;
  }

  private async maybeCreateFirstAdmin(args: { email: string; name: string; sNumberFallback: string }) {
    const userCount = await this.prisma.user.count();
    if (userCount !== 0) return null;

    const user = await this.prisma.user.create({
      data: { email: args.email, name: args.name, sNumber: args.sNumberFallback },
    });
    await this.prisma.adminUser.create({ data: { userId: user.id } });
    return user;
  }

  private async generateToken(userId: number, email: string) {
    const adminUser = await this.prisma.adminUser.findFirst({ where: { userId } });

    const payload: JwtPayload = {
      sub: userId,
      email,
      isAdmin: Boolean(adminUser),
    };

    return this.jwtService.signAsync(payload as Record<string, unknown>, { expiresIn: '1d' });
  }

  // Used by guards/controllers to assert a user exists (and refresh JWT post-link, if needed).
  async assertUserExists(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
