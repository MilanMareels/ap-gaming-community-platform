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
  let res: { redirect: ReturnType<typeof jest.fn>; clearCookie: ReturnType<typeof jest.fn> };

  const claims = { sub: 42, email: 'user@example.com', isAdmin: false, roles: [], permissions: [] };
  const query = { challenge: 'abc' };
  const googleQuery = { challenge: 'abc', provider: 'google' };
  const requestWithSession = { cookies: {}, headers: { authorization: 'Bearer session' } };
  const requestWithoutSession = { cookies: {}, headers: {} };

  const loginUrl = (provider: string) =>
    `/api/auth/${provider}/login?returnUrl=${encodeURIComponent(`/api/auth/mobile/handoff?challenge=abc&provider=${provider}`)}`;

  beforeAll(() => {
    for (const key of REQUIRED_ENV) process.env[key] ??= 'test-value';
  });

  beforeEach(async () => {
    authService = {
      verifyToken: jest.fn<() => Promise<unknown>>().mockResolvedValue(claims),
      canUseMobileApp: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      createMobileHandoffCode: jest.fn<() => Promise<string>>().mockResolvedValue('the-code'),
    };
    res = { redirect: jest.fn(), clearCookie: jest.fn() };

    const { AuthController } = await import('../../src/modules/auth/auth.controller.js');
    controller = new AuthController(authService);
  });

  it('should send a visitor without a session to Microsoft login, not the page offering Google', async () => {
    await controller.mobileHandoff(query, requestWithoutSession, res);

    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(loginUrl('microsoft')));
    expect(authService.createMobileHandoffCode).not.toHaveBeenCalled();
  });

  it('should send a session that may not use the app to Microsoft login', async () => {
    authService.canUseMobileApp.mockResolvedValue(false);

    await controller.mobileHandoff(query, requestWithSession, res);

    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(loginUrl('microsoft')));
    expect(authService.createMobileHandoffCode).not.toHaveBeenCalled();
  });

  it('should hand a session that may use the app over to it', async () => {
    await controller.mobileHandoff(query, requestWithSession, res);

    expect(authService.canUseMobileApp).toHaveBeenCalledWith(42);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('code=the-code'));
  });

  it('should check the real admin when impersonating, since that is who the app signs in', async () => {
    authService.verifyToken.mockResolvedValue({ ...claims, sub: 7, realUserId: 42 });

    await controller.mobileHandoff(query, requestWithSession, res);

    expect(authService.canUseMobileApp).toHaveBeenCalledWith(42);
  });

  describe('with Google', () => {
    it('should send a visitor without a session to Google login and back', async () => {
      await controller.mobileHandoff(googleQuery, requestWithoutSession, res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(loginUrl('google')));
    });

    it('should hand a manager over to the app', async () => {
      await controller.mobileHandoff(googleQuery, requestWithSession, res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('code=the-code'));
    });

    it('should refuse someone who is not a manager instead of looping through Google login', async () => {
      authService.canUseMobileApp.mockResolvedValue(false);

      await controller.mobileHandoff(googleQuery, requestWithSession, res);

      expect(res.redirect).toHaveBeenCalledTimes(1);
      expect(res.redirect).toHaveBeenCalledWith('apgaminghub://auth?error=not-manager');
      expect(res.clearCookie).toHaveBeenCalled();
      expect(authService.createMobileHandoffCode).not.toHaveBeenCalled();
    });
  });
});
