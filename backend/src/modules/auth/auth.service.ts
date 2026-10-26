import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import configuration from '../../common/config.js';
import { MOBILE_HANDOFF_CODE_TTL, MOBILE_TOKEN_TTL } from './constants/auth.constants.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthProfileResponseDto } from '../../dtos/auth/auth-profile-response.dto.js';
import type { JwtPayload } from './types/jwt-payload.type.js';
import type { GoogleTokenResponse } from './types/google-token-response.type.js';
import type { GoogleUserInfo } from './types/google-userinfo.type.js';
import type { MicrosoftTokenResponse } from './types/microsoft-token-response.type.js';
import type { MicrosoftUserInfo } from './types/microsoft-userinfo.type.js';

export type SsoProvider = 'google' | 'microsoft';

export type OAuthState = {
  returnUrl?: string;
  linkMode?: boolean;
  /** Random nonce to prevent replay / CSRF. */
  nonce?: string;
  /** SHA-256 of the session token, binding link-mode state to the initiating session. */
  sessionHash?: string;
};

type MobileHandoffPayload = {
  sub: number;
  challenge: string;
  typ: 'mobile-handoff';
};

@Injectable()
export class AuthService {
  private readonly config = configuration();
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Build a signed, CSRF-resistant OAuth state parameter.
   * The state includes a random nonce and is HMAC-signed with SESSION_SECRET_KEY.
   * For link-mode, the caller's session token hash is embedded so only the same
   * browser session can redeem the callback.
   */
  encodeState(state: OAuthState, sessionToken?: string): string | undefined {
    if (!state.returnUrl && !state.linkMode) return undefined;

    // Always include a random nonce to prevent replay attacks.
    state.nonce = randomBytes(16).toString('hex');

    // In link-mode, bind the state to the requesting session so another browser
    // can't replay the callback URL to hijack account linking.
    if (state.linkMode && sessionToken) {
      state.sessionHash = createHmac('sha256', this.config.session.secret).update(sessionToken).digest('hex');
    }

    const payload = Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
    const signature = createHmac('sha256', this.config.session.secret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  /**
   * Decode and verify the HMAC-signed state parameter.
   * Returns the parsed state only if the signature is valid.
   */
  decodeState(raw?: string): OAuthState {
    if (!raw) return {};
    try {
      const dotIndex = raw.lastIndexOf('.');
      if (dotIndex === -1) {
        // Legacy unsigned state — treat as plain base64url JSON or returnUrl string.
        return this.decodeLegacyState(raw);
      }

      const payload = raw.substring(0, dotIndex);
      const signature = raw.substring(dotIndex + 1);
      const expected = createHmac('sha256', this.config.session.secret).update(payload).digest('base64url');

      if (signature !== expected) {
        this.logger.warn('OAuth state signature mismatch — possible CSRF attempt');
        throw new UnauthorizedException('Invalid OAuth state');
      }

      const decoded = Buffer.from(payload, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as OAuthState;
      return {
        returnUrl: typeof parsed.returnUrl === 'string' ? parsed.returnUrl : undefined,
        linkMode: Boolean(parsed.linkMode),
        nonce: parsed.nonce,
        sessionHash: parsed.sessionHash,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      // Legacy / plain-string state: treat as returnUrl
      return { returnUrl: raw };
    }
  }

  /**
   * Verify that a link-mode state's sessionHash matches the current request's session token.
   * Prevents CSRF account-linking hijack where an attacker tricks a victim into
   * redeeming the attacker's OAuth callback.
   */
  verifyLinkModeSession(state: OAuthState, sessionToken: string | undefined): void {
    if (!state.linkMode) return;
    if (!state.sessionHash) {
      this.logger.warn('Link-mode state is missing sessionHash — rejecting');
      throw new UnauthorizedException('Invalid link state');
    }
    if (!sessionToken) {
      throw new UnauthorizedException('Not authenticated');
    }
    const currentHash = createHmac('sha256', this.config.session.secret).update(sessionToken).digest('hex');
    if (state.sessionHash !== currentHash) {
      this.logger.warn('Link-mode sessionHash mismatch — possible CSRF account-linking attempt');
      throw new UnauthorizedException('Session mismatch — please retry account linking');
    }
  }

  private decodeLegacyState(raw: string): OAuthState {
    try {
      const decoded = Buffer.from(raw, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as OAuthState;
      return {
        returnUrl: typeof parsed.returnUrl === 'string' ? parsed.returnUrl : undefined,
        linkMode: Boolean(parsed.linkMode),
      };
    } catch {
      return { returnUrl: raw };
    }
  }

  async buildGoogleLoginUrl(state: OAuthState = {}, sessionToken?: string) {
    const params = new URLSearchParams({
      client_id: this.config.google.clientId,
      redirect_uri: this.config.google.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    const encoded = this.encodeState(state, sessionToken);
    if (encoded) params.set('state', encoded);

    return `${this.config.google.authUrl}?${params.toString()}`;
  }

  async buildMicrosoftLoginUrl(state: OAuthState = {}, sessionToken?: string) {
    const params = new URLSearchParams({
      client_id: this.config.microsoft.clientId,
      redirect_uri: this.config.microsoft.redirectUri,
      response_type: 'code',
      response_mode: 'query',
      scope: 'openid email profile User.Read offline_access',
      prompt: 'select_account',
    });

    const encoded = this.encodeState(state, sessionToken);
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
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // When impersonating a role, use the JWT-embedded roles/permissions
    // instead of the DB (which would return the real admin's full permissions)
    const roles = claims.impersonatingRoleId ? (claims.roles ?? []) : user.userRoles.map((ur) => ur.role.name);
    const permissions = claims.impersonatingRoleId
      ? (claims.permissions ?? [])
      : [...new Set(user.userRoles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key)))];

    const profile: AuthProfileResponseDto = {
      id: user.id,
      name: user.name,
      email: user.email,
      sNumber: user.sNumber,
      isAdmin: roles.includes('Admin'),
      roles,
      permissions,
    };

    // Attach impersonation info if present
    if (claims.realUserId) {
      const realUser = await this.prisma.user.findUnique({
        where: { id: claims.realUserId },
        select: { id: true, name: true },
      });

      const impersonation: AuthProfileResponseDto['impersonation'] = {
        realUserId: claims.realUserId,
        realUserName: realUser?.name ?? null,
      };

      if (claims.impersonatingUserId) {
        impersonation.userId = claims.impersonatingUserId;
        impersonation.userName = user.name;
      }

      if (claims.impersonatingRoleId) {
        const role = await this.prisma.role.findUnique({
          where: { id: claims.impersonatingRoleId },
          select: { name: true },
        });
        impersonation.roleId = claims.impersonatingRoleId;
        impersonation.roleName = role?.name ?? 'Unknown';
      }

      profile.impersonation = impersonation;
    }

    return profile;
  }

  // --------------- Impersonation ---------------

  async impersonateUser(realUserId: number, targetUserId: number) {
    await this.assertIsAdmin(realUserId);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true },
    });
    if (!targetUser) throw new NotFoundException('Target user not found');

    return this.generateImpersonationToken(targetUserId, targetUser.email, {
      realUserId,
      impersonatingUserId: targetUserId,
    });
  }

  async impersonateRole(realUserId: number, roleId: number) {
    await this.assertIsAdmin(realUserId);

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: { include: { permission: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');

    // Build a token for the real user but with only this role's permissions
    const realUser = await this.prisma.user.findUnique({
      where: { id: realUserId },
      select: { id: true, email: true },
    });
    if (!realUser) throw new NotFoundException('User not found');

    const permissions = [...new Set(role.permissions.map((rp) => rp.permission.key))];

    const payload: JwtPayload = {
      sub: realUserId,
      email: realUser.email,
      isAdmin: role.name === 'Admin',
      roles: [role.name],
      permissions,
      realUserId,
      impersonatingRoleId: roleId,
    };

    return this.jwtService.signAsync(payload as Record<string, unknown>, { expiresIn: '1d' });
  }

  async stopImpersonation(claims: JwtPayload) {
    if (!claims.realUserId) {
      throw new BadRequestException('Not currently impersonating');
    }

    const realUser = await this.prisma.user.findUnique({
      where: { id: claims.realUserId },
      select: { id: true, email: true },
    });
    if (!realUser) throw new NotFoundException('Original user not found');

    return this.generateToken(realUser.id, realUser.email);
  }

  private async assertIsAdmin(userId: number) {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: { select: { name: true } } },
    });
    const isAdmin = roles.some((ur) => ur.role.name === 'Admin');
    if (!isAdmin) {
      throw new UnauthorizedException('Only admins can impersonate');
    }
  }

  private async generateImpersonationToken(
    subjectUserId: number,
    email: string,
    extra: { realUserId: number; impersonatingUserId?: number; impersonatingRoleId?: number },
  ) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: subjectUserId },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    const roles = userRoles.map((ur) => ur.role.name);
    const permissions = [...new Set(userRoles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key)))];

    const payload: JwtPayload = {
      sub: subjectUserId,
      email,
      isAdmin: roles.includes('Admin'),
      roles,
      permissions,
      ...extra,
    };

    return this.jwtService.signAsync(payload as Record<string, unknown>, { expiresIn: '1d' });
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

    const legacyUser = await this.findLegacyStudentUser(email, profile.userPrincipalName);
    if (legacyUser) {
      await this.prisma.microsoftSSOUser.create({
        data: { ssoId: profile.id, userId: legacyUser.id },
      });
      // Migrates the legacy short email to the Microsoft email, and fills in name and sNumber
      const refreshed = await this.applyMicrosoftProfile(legacyUser.id, profile);
      this.logger.log(`Linked Microsoft account to legacy user ${legacyUser.id} (${legacyUser.email} -> ${email})`);
      return refreshed ?? legacyUser;
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
    const adminRoleCount = await this.prisma.userRole.count({
      where: { role: { name: 'Admin' } },
    });
    if (adminRoleCount === 0) {
      await this.assignAdminRole(newUser.id);
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

  /**
   * Users created outside of Microsoft sign-in (admin-created reservations, roster entries, older flows)
   * can be stored under a short student email instead of the full Microsoft one. Look those up by
   * s-number so signing in takes over that user instead of creating a duplicate. Users that are already
   * linked to a Microsoft account belong to someone else's identity and are left alone.
   */
  private async findLegacyStudentUser(email: string, upn?: string) {
    const sNumber = this.extractSNumber(email, upn);
    if (!sNumber) return null;

    for (const candidate of [`${sNumber}@ap.be`, `${sNumber}@student.ap.be`]) {
      if (candidate === email) continue; // Already looked up as the full email

      const user = await this.prisma.user.findFirst({
        where: {
          email: { equals: candidate, mode: 'insensitive' },
          microsoftSSOUsers: { none: {} },
        },
      });
      if (user) return user;
    }

    return null;
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
    await this.assignAdminRole(user.id);
    return user;
  }

  private async assignAdminRole(userId: number) {
    const adminRole = await this.prisma.role.findUnique({ where: { name: 'Admin' } });
    if (adminRole) {
      await this.prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId: adminRole.id } },
        update: {},
        create: { userId, roleId: adminRole.id },
      });
    }
  }

  // --------------- Mobile app handoff ---------------

  /** Short-lived code handed to the mobile app after it signed in through the web UI, bound to the app's PKCE challenge. */
  async createMobileHandoffCode(claims: JwtPayload, challenge: string) {
    const payload: MobileHandoffPayload = { sub: claims.realUserId ?? claims.sub, challenge, typ: 'mobile-handoff' };
    return this.jwtService.signAsync(payload as Record<string, unknown>, { secret: this.mobileHandoffSecret(), expiresIn: MOBILE_HANDOFF_CODE_TTL });
  }

  async exchangeMobileHandoffCode(code: string, verifier: string) {
    let payload: MobileHandoffPayload;
    try {
      payload = await this.jwtService.verifyAsync<MobileHandoffPayload>(code, { secret: this.mobileHandoffSecret() });
    } catch {
      throw new UnauthorizedException('Invalid or expired login code');
    }

    const expectedChallenge = createHash('sha256').update(verifier).digest('base64url');
    if (payload.typ !== 'mobile-handoff' || payload.challenge !== expectedChallenge) {
      throw new UnauthorizedException('Invalid or expired login code');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true } });
    if (!user) throw new UnauthorizedException('User not found');

    return this.generateToken(user.id, user.email, MOBILE_TOKEN_TTL);
  }

  // Separate secret so a handoff code can never be used as a regular auth token
  private mobileHandoffSecret() {
    return `${this.config.jwt.secret}:mobile-handoff`;
  }

  private async generateToken(userId: number, email: string, expiresIn: JwtSignOptions['expiresIn'] = '1d') {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const roles = userRoles.map((ur) => ur.role.name);
    const permissions = [...new Set(userRoles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key)))];

    const payload: JwtPayload = {
      sub: userId,
      email,
      isAdmin: roles.includes('Admin'),
      roles,
      permissions,
    };

    return this.jwtService.signAsync(payload as Record<string, unknown>, { expiresIn });
  }

  // Used by guards/controllers to assert a user exists (and refresh JWT post-link, if needed).
  async assertUserExists(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
