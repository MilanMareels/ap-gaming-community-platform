import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { buildAuditChanges, MAX_ROWS_PER_OPERATION } from '../../src/modules/audit/audit-prisma.extension.js';
import { changedFields, REDACTED, sanitizeForAudit } from '../../src/modules/audit/audit-sanitize.js';
import { AuditService, shouldLogRequest } from '../../src/modules/audit/audit.service.js';
import { auditActionName } from '../../src/modules/audit/audit-action.guard.js';
import { auditErrorMessage } from '../../src/modules/audit/audit-exception.filter.js';
import {
  auditStorage,
  createAuditContext,
  describeAudit,
  recordAuditChanges,
  setAuditActor,
  setOrphanAuditHandler,
} from '../../src/modules/audit/audit-context.js';

const reservation = {
  id: 42,
  cuid: 'c1',
  userId: 7,
  controllers: 1,
  email: 'student@ap.be',
  inventory: 'pc',
  startTime: new Date('2026-11-22T14:00:00.000Z'),
  endTime: new Date('2026-11-22T15:00:00.000Z'),
  status: 'RESERVED',
  createdAt: null,
  createdByStaff: false,
};

describe('buildAuditChanges', () => {
  it('logs an update with the old and new values and only the fields that changed', () => {
    const [change] = buildAuditChanges({
      model: 'Reservation',
      operation: 'update',
      args: { where: { id: 42 }, data: { status: 'PRESENT' } },
      result: { ...reservation, status: 'PRESENT' },
      before: [reservation],
    });

    expect(change.operation).toBe('update');
    expect(change.entityId).toBe('42');
    expect(change.changedFields).toEqual(['status']);
    expect(change.before?.status).toBe('RESERVED');
    expect(change.after?.status).toBe('PRESENT');
    expect(change.after?.startTime).toBe('2026-11-22T14:00:00.000Z');
  });

  it('logs nothing for an update that changed nothing', () => {
    const changes = buildAuditChanges({
      model: 'Reservation',
      operation: 'update',
      args: { where: { id: 42 }, data: { status: 'RESERVED' } },
      result: reservation,
      before: [reservation],
    });
    expect(changes).toEqual([]);
  });

  it('keeps included relations out of the snapshot', () => {
    const [change] = buildAuditChanges({
      model: 'Role',
      operation: 'update',
      args: { where: { id: 1 }, data: { name: 'Bestuur' } },
      result: { id: 1, name: 'Bestuur', description: null, isSystem: false, permissions: [{ id: 1, permission: { key: 'x' } }] },
      before: [{ id: 1, name: 'Staff', description: null, isSystem: false }],
    });
    expect(change.after).not.toHaveProperty('permissions');
    expect(change.changedFields).toEqual(['name']);
  });

  it('logs only the written fields of an update inside a batch transaction, where the old row is unknown', () => {
    const [change] = buildAuditChanges({
      model: 'RosterEntry',
      operation: 'update',
      args: { where: { id: 3 }, data: { order: 2 } },
      result: { id: 3, order: 2, handle: 'x' },
    });
    expect(change.before).toBeNull();
    expect(change.entityId).toBe('3');
    expect(change.changedFields).toEqual(['order']);
  });

  it('resolves atomic operations like increment from the result', () => {
    const [change] = buildAuditChanges({
      model: 'RosterEntry',
      operation: 'update',
      args: { where: { id: 3 }, data: { order: { increment: 1 } } },
      result: { id: 3, order: 5 },
      before: [{ id: 3, order: 4 }],
    });
    expect(change.before?.order).toBe(4);
    expect(change.after?.order).toBe(5);
  });

  it('logs a created row with its id', () => {
    const [change] = buildAuditChanges({
      model: 'Reservation',
      operation: 'create',
      args: { data: { userId: 7, user: { connect: { id: 7 } } } },
      result: reservation,
    });
    expect(change.operation).toBe('create');
    expect(change.entityId).toBe('42');
    expect(change.before).toBeNull();
    expect(change.after).not.toHaveProperty('user');
  });

  it('logs the full row of a delete, even when the delete selected only some fields', () => {
    const [change] = buildAuditChanges({
      model: 'Reservation',
      operation: 'delete',
      args: { where: { id: 42 }, select: { id: true } },
      result: { id: 42 },
      before: [reservation],
    });
    expect(change.before?.email).toBe('student@ap.be');
    expect(change.after).toBeNull();
  });

  it('logs every row a deleteMany removed', () => {
    const changes = buildAuditChanges({
      model: 'UserRole',
      operation: 'deleteMany',
      args: { where: { roleId: 1 } },
      result: { count: 2 },
      before: [
        { id: 1, userId: 1, roleId: 1 },
        { id: 2, userId: 2, roleId: 1 },
      ],
    });
    expect(changes.map((c) => c.entityId)).toEqual(['1', '2']);
    expect(changes.every((c) => c.operation === 'delete')).toBe(true);
  });

  it('summarises a deleteMany whose rows could not be read first', () => {
    const [change] = buildAuditChanges({
      model: 'RolePermission',
      operation: 'deleteMany',
      args: { where: { roleId: 1 } },
      result: { count: 3 },
    });
    expect(change.entityId).toBeNull();
    expect(change.after).toEqual({ _where: { roleId: 1 }, _count: 3 });
  });

  it('logs each row of an updateMany and marks a list that was cut short', () => {
    const rows = Array.from({ length: MAX_ROWS_PER_OPERATION + 1 }, (_, i) => ({ ...reservation, id: i + 1, status: 'NO_SHOW' }));
    const changes = buildAuditChanges({
      model: 'Reservation',
      operation: 'updateMany',
      args: { where: { status: 'NO_SHOW' }, data: { status: 'CANCELLED' } },
      result: { count: rows.length },
      before: rows,
    });
    expect(changes).toHaveLength(MAX_ROWS_PER_OPERATION + 1);
    expect(changes[0].changedFields).toEqual(['status']);
    expect(changes.at(-1)?.after).toMatchObject({ _count: rows.length, _onlyFirstRowsLogged: MAX_ROWS_PER_OPERATION });
  });

  it('logs an upsert that found no row as a create', () => {
    const [change] = buildAuditChanges({
      model: 'Setting',
      operation: 'upsert',
      args: { where: { key: 'a' }, create: { key: 'a', value: '1' }, update: { value: '1' } },
      result: { id: 9, key: 'a', value: '1' },
      before: [],
    });
    expect(change.operation).toBe('create');
    expect(change.after).toEqual({ id: 9, key: 'a', value: '1' });
  });

  it('hides secrets but still says they changed', () => {
    const [change] = buildAuditChanges({
      model: 'DynamicForm',
      operation: 'update',
      args: { where: { id: 1 }, data: { discordWebhookUrl: 'https://discord.com/api/webhooks/new' } },
      result: { id: 1, title: 'Form', discordWebhookUrl: 'https://discord.com/api/webhooks/new' },
      before: [{ id: 1, title: 'Form', discordWebhookUrl: 'https://discord.com/api/webhooks/old' }],
    });
    expect(change.changedFields).toEqual(['discordWebhookUrl']);
    expect(change.before?.discordWebhookUrl).toBe(REDACTED);
    expect(change.after?.discordWebhookUrl).toBe(REDACTED);
  });
});

describe('sanitizeForAudit', () => {
  it('redacts credentials anywhere in a request', () => {
    expect(sanitizeForAudit({ body: { code: 'abc', verifier: 'v', nested: { accessToken: 't' }, name: 'x' } })).toEqual({
      body: { code: REDACTED, verifier: REDACTED, nested: { accessToken: REDACTED }, name: 'x' },
    });
  });

  it('cuts long text and long lists short', () => {
    const text = sanitizeForAudit('a'.repeat(6000)) as string;
    expect(text.length).toBeLessThan(5100);
    expect(text).toContain('6000 tekens');
    const list = sanitizeForAudit(Array.from({ length: 250 }, (_, i) => i)) as unknown[];
    expect(list).toHaveLength(201);
  });

  it('ignores updatedAt when comparing rows', () => {
    expect(changedFields({ a: 1, updatedAt: new Date(1) }, { a: 1, updatedAt: new Date(2) })).toEqual([]);
  });
});

describe('shouldLogRequest', () => {
  it('logs every change-making request, also failed ones', () => {
    const ctx = createAuditContext('request', 'reservations.update');
    expect(shouldLogRequest(ctx, 'PATCH', 200, true)).toBe(true);
    expect(shouldLogRequest(ctx, 'PATCH', 400, true)).toBe(true);
  });

  it('logs a logged-in user being refused for lack of permission', () => {
    expect(shouldLogRequest(createAuditContext('request', 'rbac.deleteRole'), 'DELETE', 401, true)).toBe(true);
  });

  it('skips reads, unknown routes and anonymous requests without a login', () => {
    expect(shouldLogRequest(createAuditContext('request', 'reservations.findAll'), 'GET', 200, true)).toBe(false);
    expect(shouldLogRequest(createAuditContext('request'), 'POST', 404, true)).toBe(false);
    expect(shouldLogRequest(createAuditContext('request', 'reservations.update'), 'PATCH', 401, false)).toBe(false);
  });

  it('logs a read that changed data or described itself', () => {
    const ctx = createAuditContext('request', 'auth.googleCallback');
    expect(shouldLogRequest(ctx, 'GET', 302, false)).toBe(false);
    auditStorage.run(ctx, () => describeAudit({ event: 'login' }));
    expect(shouldLogRequest(ctx, 'GET', 302, false)).toBe(true);
  });
});

describe('audit context', () => {
  it('collects changes and details for the current action only', () => {
    const ctx = createAuditContext('request');
    auditStorage.run(ctx, () => {
      recordAuditChanges([{ model: 'Role', entityId: '1', operation: 'delete', before: { id: 1 }, after: null, changedFields: [] }]);
      describeAudit({ role: 'Staff' });
      setAuditActor({ sub: 5, email: 'a@ap.be' });
    });
    expect(ctx.changes).toHaveLength(1);
    expect(ctx.details).toEqual({ role: 'Staff' });
    expect(ctx.actor?.sub).toBe(5);
  });

  it('hands changes made outside any action to the fallback', () => {
    const orphan = jest.fn();
    setOrphanAuditHandler(orphan);
    recordAuditChanges([{ model: 'Role', entityId: '1', operation: 'delete', before: null, after: null, changedFields: [] }]);
    setOrphanAuditHandler(undefined);
    expect(orphan).toHaveBeenCalledTimes(1);
  });
});

describe('naming', () => {
  it('names actions after controller and handler', () => {
    expect(auditActionName('ReservationsController', 'updateStatus')).toBe('reservations.updateStatus');
    expect(auditActionName('FormSubmissionsController', 'addComment')).toBe('formSubmissions.addComment');
  });

  it('keeps the message of a failed request', () => {
    expect(auditErrorMessage(new BadRequestException(['name should not be empty', 'email must be an email']))).toBe(
      'name should not be empty; email must be an email',
    );
    expect(auditErrorMessage(new UnauthorizedException('Access denied. Required permission: roles.manage'))).toBe(
      'Access denied. Required permission: roles.manage',
    );
    expect(auditErrorMessage(new Error('boom'))).toBe('Serverfout: boom');
  });
});

describe('AuditService', () => {
  let service: AuditService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      auditEvent: { create: jest.fn(async () => ({})) },
      user: {
        findMany: jest.fn(async () => [
          { id: 7, email: 'student@ap.be', name: 'Student' },
          { id: 1, email: 'admin@ap.be', name: 'Admin' },
        ]),
      },
      role: { findUnique: jest.fn(async () => ({ name: 'Staff' })) },
    };
    service = new AuditService(prisma);
  });

  function fakeResponse(statusCode: number) {
    return Object.assign(new EventEmitter(), { statusCode, writableFinished: true }) as any;
  }

  it('attributes an action done while impersonating to both the user and the admin behind it', async () => {
    const ctx = createAuditContext('request', 'reservations.cancelMine', 'Cancel an own reservation');
    ctx.changes.push({ model: 'Reservation', entityId: '42', operation: 'update', before: null, after: null, changedFields: ['status'] });
    const req = {
      method: 'PATCH',
      originalUrl: '/api/reservations/me/c1/cancel?x=1',
      params: { cuid: 'c1' },
      query: {},
      body: {},
      headers: { 'user-agent': 'jest' },
      ip: '10.0.0.1',
      user: { sub: 7, email: 'student@ap.be', realUserId: 1 },
    } as any;

    await service.finishRequest(ctx, req, fakeResponse(200));

    const data = prisma.auditEvent.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      actorType: 'USER',
      actorId: 7,
      actorName: 'Student',
      realActorId: 1,
      realActorEmail: 'admin@ap.be',
      action: 'reservations.cancelMine',
      path: '/api/reservations/me/c1/cancel',
      statusCode: 200,
      success: true,
      ip: '10.0.0.1',
      request: { params: { cuid: 'c1' } },
    });
    expect(data.changes.create).toHaveLength(1);
  });

  it('logs anonymous actions, such as cancelling through the link in an email', async () => {
    const ctx = createAuditContext('request', 'reservations.cancelByCuid');
    const req = { method: 'PATCH', originalUrl: '/api/reservations/cancel/c1', params: {}, query: {}, body: {}, headers: {} } as any;
    await service.finishRequest(ctx, req, fakeResponse(200));
    expect(prisma.auditEvent.create.mock.calls[0][0].data.actorType).toBe('ANONYMOUS');
  });

  it('does not log plain reads', async () => {
    const ctx = createAuditContext('request', 'reservations.findAll');
    const req = { method: 'GET', originalUrl: '/api/reservations', headers: {}, user: { sub: 1, email: 'a' } } as any;
    await service.finishRequest(ctx, req, fakeResponse(200));
    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  });

  it('logs what a scheduled job changed as done by the system', async () => {
    const result = await service.runAsSystem('scheduler.markOverdueNoShows', 'No-shows', async () => {
      recordAuditChanges([{ model: 'Reservation', entityId: '42', operation: 'update', before: null, after: null, changedFields: ['status'] }]);
      return 1;
    });
    expect(result).toBe(1);
    expect(prisma.auditEvent.create.mock.calls[0][0].data).toMatchObject({ actorType: 'SYSTEM', action: 'scheduler.markOverdueNoShows' });
  });

  it('skips a scheduled job that changed nothing', async () => {
    await service.runAsSystem('scheduler.markOverdueNoShows', 'No-shows', async () => 0);
    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  });

  it('never lets a failing audit write break the action', async () => {
    prisma.auditEvent.create.mockRejectedValueOnce(new Error('db down'));
    const ctx = createAuditContext('request', 'rbac.deleteRole');
    const req = {
      method: 'DELETE',
      originalUrl: '/api/rbac/roles/1',
      params: {},
      query: {},
      body: {},
      headers: {},
      user: { sub: 1, email: 'a' },
    } as any;
    await expect(service.finishRequest(ctx, req, fakeResponse(200))).resolves.toBeUndefined();
  });
});
