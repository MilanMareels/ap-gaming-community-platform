import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { PrismaService } from '../../src/modules/prisma/prisma.service.js';
import type { MicrosoftUserInfo } from '../../src/modules/auth/types/microsoft-userinfo.type.js';

const REQUIRED_ENV = [
  'JWT_SECRET_KEY',
  'SESSION_SECRET_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  'MICROSOFT_REDIRECT_URI',
  'MICROSOFT_TENANT_ID',
];

const profile: MicrosoftUserInfo = {
  id: 'ms-oid-1',
  mail: 'jamie.peeters@student.ap.be',
  userPrincipalName: 's145678@ap.be',
  givenName: 'Jamie',
  surname: 'Peeters',
  displayName: 'Jamie Peeters',
};

const legacyUser = { id: 42, email: 's145678@ap.be', name: null, sNumber: 's145678' };

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;

  beforeAll(() => {
    for (const key of REQUIRED_ENV) process.env[key] ??= 'test-value';
  });

  beforeEach(async () => {
    const mockPrisma = {
      user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      microsoftSSOUser: { findUnique: jest.fn(), create: jest.fn() },
      adminUser: { count: jest.fn<() => Promise<number>>().mockResolvedValue(1), create: jest.fn() },
      setting: { findUnique: jest.fn<() => Promise<null>>().mockResolvedValue(null), delete: jest.fn() },
      role: { findUnique: jest.fn() },
      userRole: { upsert: jest.fn(), count: jest.fn<() => Promise<number>>().mockResolvedValue(1) },
    };

    const module = await Test.createTestingModule({
      providers: [AuthService, { provide: PrismaService, useValue: mockPrisma }, { provide: JwtService, useValue: {} }],
    }).compile();

    service = module.get(AuthService);
    prisma = module.get(PrismaService);

    prisma.microsoftSSOUser.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.update.mockImplementation(async ({ where, data }: any) => ({ ...legacyUser, id: where.id, ...data }));
    prisma.user.create.mockImplementation(async ({ data }: any) => ({ id: 99, ...data }));
  });

  const signIn = (p: MicrosoftUserInfo = profile) => (service as any).findOrCreateUserFromMicrosoft(p);

  describe('Microsoft sign-in with legacy short emails', () => {
    it('should use the user with the full Microsoft email when it exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 7, email: profile.mail, name: 'Jamie Peeters', sNumber: 's145678' });

      const user = await signIn();

      expect(user.id).toBe(7);
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('should take over a user stored under sxxxxxx@ap.be and migrate it to the full email', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(legacyUser);

      const user = await signIn();

      expect(prisma.microsoftSSOUser.create).toHaveBeenCalledWith({ data: { ssoId: profile.id, userId: legacyUser.id } });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: legacyUser.id },
        data: { name: 'Jamie Peeters', email: 'jamie.peeters@student.ap.be', sNumber: 's145678' },
      });
      expect(user).toMatchObject({ id: legacyUser.id, email: 'jamie.peeters@student.ap.be', name: 'Jamie Peeters' });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should fall back to sxxxxxx@student.ap.be when there is no sxxxxxx@ap.be user', async () => {
      const studentLegacy = { ...legacyUser, email: 's145678@student.ap.be' };
      prisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(studentLegacy);

      const user = await signIn();

      expect(prisma.user.findFirst).toHaveBeenNthCalledWith(1, {
        where: { email: { equals: 's145678@ap.be', mode: 'insensitive' }, microsoftSSOUsers: { none: {} } },
      });
      expect(prisma.user.findFirst).toHaveBeenNthCalledWith(2, {
        where: { email: { equals: 's145678@student.ap.be', mode: 'insensitive' }, microsoftSSOUsers: { none: {} } },
      });
      expect(user.id).toBe(legacyUser.id);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should not look up the short email again when it is the full Microsoft email', async () => {
      await signIn({ ...profile, mail: 's145678@student.ap.be', userPrincipalName: 's145678@student.ap.be' });

      expect(prisma.user.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: { equals: 's145678@ap.be', mode: 'insensitive' }, microsoftSSOUsers: { none: {} } },
      });
    });

    it('should create a new user when no legacy user exists', async () => {
      const user = await signIn();

      expect(prisma.user.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'jamie.peeters@student.ap.be', name: 'Jamie Peeters', sNumber: 's145678' },
      });
      expect(user.id).toBe(99);
    });

    it('should skip the legacy lookup for accounts without an s-number', async () => {
      await signIn({ ...profile, mail: 'jamie.peeters@ap.be', userPrincipalName: 'jamie.peeters@ap.be' });

      expect(prisma.user.findFirst).not.toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalled();
    });
  });

  describe('Mobile app handoff', () => {
    const verifier = 'a'.repeat(43);
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const claims = { sub: 42, email: legacyUser.email, isAdmin: false, roles: [], permissions: [] };
    let jwt: JwtService;
    let mobileService: AuthService;

    beforeEach(async () => {
      jwt = new JwtService({ secret: process.env.JWT_SECRET_KEY });
      prisma.user.findUnique.mockResolvedValue(legacyUser);
      (prisma as any).userRole.findMany = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]);

      const module = await Test.createTestingModule({
        providers: [AuthService, { provide: PrismaService, useValue: prisma }, { provide: JwtService, useValue: jwt }],
      }).compile();
      mobileService = module.get(AuthService);
    });

    it('should exchange a handoff code for an auth token when the verifier matches', async () => {
      const code = await mobileService.createMobileHandoffCode(claims, challenge);
      const token = await mobileService.exchangeMobileHandoffCode(code, verifier);

      const payload = await mobileService.verifyToken(token);
      expect(payload.sub).toBe(42);
    });

    it('should hand over the real admin when impersonating', async () => {
      const code = await mobileService.createMobileHandoffCode({ ...claims, sub: 7, realUserId: 42 }, challenge);
      await mobileService.exchangeMobileHandoffCode(code, verifier);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42 } }));
    });

    it('should reject a code with the wrong verifier', async () => {
      const code = await mobileService.createMobileHandoffCode(claims, challenge);

      await expect(mobileService.exchangeMobileHandoffCode(code, 'b'.repeat(43))).rejects.toThrow('Invalid or expired login code');
    });

    it('should not accept a handoff code as a regular auth token', async () => {
      const code = await mobileService.createMobileHandoffCode(claims, challenge);

      await expect(mobileService.verifyToken(code)).rejects.toThrow();
    });

    it('should not accept a regular auth token as a handoff code', async () => {
      const token = await jwt.signAsync({ ...claims, challenge, typ: 'mobile-handoff' });

      await expect(mobileService.exchangeMobileHandoffCode(token, verifier)).rejects.toThrow('Invalid or expired login code');
    });
  });
});
