import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

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

/**
 * Runs real HTTP requests through the audit middleware, guard and exception filter, with the database
 * mocked, to prove the pieces work together: the action is known even when a permission check refuses
 * the request, and what the route changed ends up on its audit entry.
 */
describe('Audit log over HTTP', () => {
  let app: INestApplication;
  let prisma: any;
  let token: (claims: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    for (const key of REQUIRED_ENV) process.env[key] ??= 'test-value';

    const { Body, Controller, Get, Global, Module, Post, UseGuards, BadRequestException } = await import('@nestjs/common');
    const { ApiOperation } = await import('@nestjs/swagger');
    const { Test } = await import('@nestjs/testing');
    const { JwtService } = await import('@nestjs/jwt');
    const { PrismaService } = await import('../../src/modules/prisma/prisma.service.js');
    const { AuditModule } = await import('../../src/modules/audit/audit.module.js');
    const { AuthModule } = await import('../../src/modules/auth/auth.module.js');
    const { RbacModule } = await import('../../src/modules/rbac/rbac.module.js');
    const { JwtAuthGuard } = await import('../../src/guards/jwt-auth.guard.js');
    const { PermissionGuard } = await import('../../src/guards/permission.guard.js');
    const { RequirePermissions } = await import('../../src/decorators/require-permissions.decorator.js');
    const { Public } = await import('../../src/modules/auth/public.decorator.js');
    const { describeAudit, recordAuditChanges } = await import('../../src/modules/audit/audit-context.js');

    prisma = {
      auditEvent: { create: jest.fn(async () => ({})) },
      user: { findMany: jest.fn(async () => [{ id: 3, email: 'staff@ap.be', name: 'Staff' }]) },
      role: { findUnique: jest.fn(async () => ({ name: 'Viewer' })) },
      userNote: { findMany: jest.fn(async (): Promise<unknown[]> => []) },
    };

    @Controller('things')
    class ThingsController {
      @Public()
      @Get()
      list() {
        return [];
      }

      @Public()
      @Post()
      @ApiOperation({ summary: 'Create a thing' })
      async create(@Body() body: Record<string, unknown>) {
        // The context must survive awaits, as it does across real database calls
        await new Promise((resolve) => setTimeout(resolve, 5));
        recordAuditChanges([{ model: 'Thing', entityId: '1', operation: 'create', before: null, after: { id: 1 }, changedFields: [] }]);
        describeAudit({ thing: body.name });
        return { id: 1 };
      }

      @Public()
      @Post('broken')
      fail() {
        throw new BadRequestException('Name is required');
      }

      @Post('guarded')
      @UseGuards(JwtAuthGuard, PermissionGuard)
      @RequirePermissions('things.manage')
      guarded() {
        return { ok: true };
      }
    }

    @Global()
    @Module({ providers: [{ provide: PrismaService, useValue: prisma }], exports: [PrismaService] })
    class FakePrismaModule {}

    @Module({ imports: [FakePrismaModule, AuditModule, AuthModule, RbacModule], controllers: [ThingsController] })
    class TestAppModule {}

    const moduleRef = await Test.createTestingModule({ imports: [TestAppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    await app.init();

    const jwt = new JwtService({ secret: process.env.JWT_SECRET_KEY });
    token = (claims) => jwt.signAsync(claims);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    prisma.auditEvent.create.mockClear();
  });

  /** The entry is written after the response is sent */
  async function nextAuditEntry() {
    for (let i = 0; i < 50 && prisma.auditEvent.create.mock.calls.length === 0; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return prisma.auditEvent.create.mock.calls[0]?.[0]?.data;
  }

  async function settle() {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  it('logs an action with its description, request, details and changes', async () => {
    await request(app.getHttpServer()).post('/api/things').send({ name: 'Lamp', password: 'hunter2' }).expect(201);

    const entry = await nextAuditEntry();
    expect(entry).toMatchObject({
      actorType: 'ANONYMOUS',
      action: 'things.create',
      description: 'Create a thing',
      method: 'POST',
      path: '/api/things',
      statusCode: 201,
      success: true,
      request: { body: { name: 'Lamp', password: '[verborgen]' } },
      details: { thing: 'Lamp' },
    });
    expect(entry.changes.create).toEqual([expect.objectContaining({ model: 'Thing', entityId: '1', operation: 'create' })]);
  });

  it('logs why an action failed', async () => {
    await request(app.getHttpServer()).post('/api/things/broken').expect(400);
    expect(await nextAuditEntry()).toMatchObject({ action: 'things.fail', statusCode: 400, success: false, error: 'Name is required' });
  });

  it('logs a logged-in user who is refused for lack of permission', async () => {
    const jwt = await token({ sub: 3, email: 'staff@ap.be', realUserId: 3, impersonatingRoleId: 9, permissions: [] });
    await request(app.getHttpServer()).post('/api/things/guarded').set('Authorization', `Bearer ${jwt}`).expect(401);

    expect(await nextAuditEntry()).toMatchObject({
      actorType: 'USER',
      actorId: 3,
      actorName: 'Staff',
      impersonatedRole: 'Viewer',
      action: 'things.guarded',
      success: false,
      error: 'Access denied. Required permission: things.manage',
    });
  });

  describe('a blocked user', () => {
    const blockFor = (blockedUserId: number) =>
      prisma.userNote.findMany.mockImplementation(async ({ where }: any) => (where.userId === blockedUserId ? [{ id: 1, expiresAt: null }] : []));

    it('is refused on every request, even with a session from before the block, and loses the session', async () => {
      blockFor(3);
      const jwt = await token({ sub: 3, email: 'staff@ap.be', realUserId: 3, impersonatingRoleId: 9, permissions: ['things.manage'] });
      const response = await request(app.getHttpServer()).post('/api/things/guarded').set('Authorization', `Bearer ${jwt}`).expect(401);

      expect(response.body.message).toBe('Account blocked');
      expect(String(response.headers['set-cookie'])).toContain('apgh_token=;');
      prisma.userNote.findMany.mockResolvedValue([]);
    });

    it('can still be viewed by an admin impersonating them', async () => {
      blockFor(5);
      const jwt = await token({ sub: 5, email: 'blocked@ap.be', realUserId: 3, impersonatingRoleId: 9, permissions: ['things.manage'] });
      await request(app.getHttpServer()).post('/api/things/guarded').set('Authorization', `Bearer ${jwt}`).expect(201);
      prisma.userNote.findMany.mockResolvedValue([]);
    });
  });

  it('does not log reads or anonymous requests without a login', async () => {
    await request(app.getHttpServer()).get('/api/things').expect(200);
    await request(app.getHttpServer()).post('/api/things/guarded').expect(401);
    await request(app.getHttpServer()).post('/api/nowhere').expect(404);
    await settle();
    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  });
});
