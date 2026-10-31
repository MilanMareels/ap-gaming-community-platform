import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

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

describe('AuthController mobile handoff', () => {
  let controller: any;
  let authService: any;
  let res: { redirect: ReturnType<typeof jest.fn> };

  const claims = { sub: 42, email: 'user@example.com', isAdmin: false, roles: [], permissions: [] };
  const query = { challenge: 'abc' };
  const requestWithSession = { cookies: {}, headers: { authorization: 'Bearer session' } };
  const requestWithoutSession = { cookies: {}, headers: {} };

  const microsoftLogin = `/api/auth/microsoft/login?returnUrl=${encodeURIComponent('/api/auth/mobile/handoff?challenge=abc')}`;

  beforeAll(() => {
    for (const key of REQUIRED_ENV) process.env[key] ??= 'test-value';
  });

  beforeEach(async () => {
    authService = {
      verifyToken: jest.fn<() => Promise<unknown>>().mockResolvedValue(claims),
      hasMicrosoftLink: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      createMobileHandoffCode: jest.fn<() => Promise<string>>().mockResolvedValue('the-code'),
    };
    res = { redirect: jest.fn() };

    const { AuthController } = await import('../../src/modules/auth/auth.controller.js');
    controller = new AuthController(authService);
  });

  it('should send a visitor without a session to Microsoft login, not the page offering Google', async () => {
    await controller.mobileHandoff(query, requestWithoutSession, res);

    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(microsoftLogin));
    expect(authService.createMobileHandoffCode).not.toHaveBeenCalled();
  });

  it('should not hand a session without a Microsoft account to the app', async () => {
    authService.hasMicrosoftLink.mockResolvedValue(false);

    await controller.mobileHandoff(query, requestWithSession, res);

    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(microsoftLogin));
    expect(authService.createMobileHandoffCode).not.toHaveBeenCalled();
  });

  it('should hand a session with a Microsoft account to the app', async () => {
    await controller.mobileHandoff(query, requestWithSession, res);

    expect(authService.hasMicrosoftLink).toHaveBeenCalledWith(42);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('code=the-code'));
  });

  it('should check the real admin when impersonating, since that is who the app signs in', async () => {
    authService.verifyToken.mockResolvedValue({ ...claims, sub: 7, realUserId: 42 });

    await controller.mobileHandoff(query, requestWithSession, res);

    expect(authService.hasMicrosoftLink).toHaveBeenCalledWith(42);
  });
});
