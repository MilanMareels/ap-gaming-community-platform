import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import type { AuditLogQueryDto } from '../../dtos/audit/audit.dto.js';
import {
  auditStorage,
  createAuditContext,
  setOrphanAuditHandler,
  type AuditActorClaims,
  type AuditContext,
  type PendingAuditChange,
} from './audit-context.js';
import { sanitizeForAudit } from './audit-sanitize.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const MAX_ERROR_LENGTH = 2000;
const MAX_USER_AGENT_LENGTH = 400;

type UploadedFileInfo = { originalname: string; mimetype: string; size: number };
type AuditedRequest = Request & { user?: JwtPayload; file?: UploadedFileInfo };

type ResolvedActor = {
  actorType: 'USER' | 'ANONYMOUS' | 'SYSTEM';
  actorId: number | null;
  actorEmail: string | null;
  actorName: string | null;
  realActorId: number | null;
  realActorEmail: string | null;
  realActorName: string | null;
  impersonatedRole: string | null;
};

const SYSTEM_ACTOR: ResolvedActor = {
  actorType: 'SYSTEM',
  actorId: null,
  actorEmail: null,
  actorName: null,
  realActorId: null,
  realActorEmail: null,
  realActorName: null,
  impersonatedRole: null,
};

function json(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'object' && Object.keys(value).length === 0) return undefined;
  return value as Prisma.InputJsonValue;
}

function truncate(value: string | undefined | null, max: number) {
  if (!value) return null;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/** Whether a finished request should end up in the audit log. */
export function shouldLogRequest(ctx: AuditContext, method: string, statusCode: number, authenticated: boolean): boolean {
  if (ctx.changes.length > 0 || ctx.force) return true;
  // Reads are not logged, and neither are requests that matched no route
  if (!MUTATING_METHODS.has(method) || !ctx.action) return false;
  // Anonymous requests turned away for lack of a login are noise (bots, expired sessions), not someone's action
  if (!authenticated && (statusCode === 401 || statusCode === 403)) return false;
  return true;
}

@Injectable()
export class AuditService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Writes that happen outside any request or job (e.g. a timer someone adds later) are still logged
    setOrphanAuditHandler((changes) => {
      void this.write(SYSTEM_ACTOR, { action: 'system.unattributed', description: 'Wijziging buiten een verzoek of taak' }, changes);
    });
  }

  onModuleDestroy() {
    setOrphanAuditHandler(undefined);
  }

  /** Runs a scheduled job or other background work, logging what it changed as done by the system. */
  async runAsSystem<T>(action: string, description: string, fn: () => Promise<T>): Promise<T> {
    const ctx = createAuditContext('system', action, description);
    try {
      return await auditStorage.run(ctx, fn);
    } catch (error) {
      ctx.error = error instanceof Error ? error.message : String(error);
      ctx.force = true;
      throw error;
    } finally {
      if (ctx.changes.length > 0 || ctx.force) {
        await this.write(SYSTEM_ACTOR, ctx, ctx.changes, {
          success: !ctx.error,
          error: truncate(ctx.error, MAX_ERROR_LENGTH),
          durationMs: Date.now() - ctx.startedAt,
          details: json(ctx.details),
        });
      }
    }
  }

  /** Called when a response has been sent: writes the request's audit entry if it is worth one. */
  async finishRequest(ctx: AuditContext, req: AuditedRequest, res: Response) {
    const claims: AuditActorClaims | undefined = ctx.actor ?? req.user;
    const aborted = !res.writableFinished;
    const statusCode = res.statusCode;
    if (!aborted && !shouldLogRequest(ctx, req.method, statusCode, Boolean(claims))) return;

    try {
      const actor = await this.resolveActor(claims);
      const path = (req.originalUrl || req.url).split('?')[0];
      await this.write(actor, { action: ctx.action ?? `http.${req.method.toLowerCase()}`, description: ctx.description }, ctx.changes, {
        method: req.method,
        path: truncate(path, 1000),
        statusCode,
        success: !aborted && statusCode < 400,
        error: truncate(ctx.error ?? (aborted ? 'Verbinding verbroken voor het antwoord verstuurd was' : undefined), MAX_ERROR_LENGTH),
        durationMs: Date.now() - ctx.startedAt,
        ip: req.ip ?? null,
        userAgent: truncate(req.headers['user-agent'], MAX_USER_AGENT_LENGTH),
        request: json(sanitizeForAudit(this.describeRequest(req))),
        details: json(sanitizeForAudit(ctx.details)),
      });
    } catch (error) {
      this.logger.error(`Could not write audit entry for ${req.method} ${req.url}`, error instanceof Error ? error.stack : String(error));
    }
  }

  private describeRequest(req: AuditedRequest) {
    const request: Record<string, unknown> = {};
    if (req.params && Object.keys(req.params).length > 0) request.params = { ...req.params };
    if (req.query && Object.keys(req.query).length > 0) request.query = req.query;
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) request.body = req.body;
    if (req.file) request.file = { name: req.file.originalname, type: req.file.mimetype, size: req.file.size };
    return request;
  }

  private async resolveActor(claims: AuditActorClaims | undefined): Promise<ResolvedActor> {
    if (!claims) return { ...SYSTEM_ACTOR, actorType: 'ANONYMOUS' };

    const realUserId = claims.realUserId && claims.realUserId !== claims.sub ? claims.realUserId : null;
    const ids = [claims.sub, ...(realUserId ? [realUserId] : [])];
    const [users, role] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, name: true } }),
      claims.impersonatingRoleId
        ? this.prisma.role.findUnique({ where: { id: claims.impersonatingRoleId }, select: { name: true } })
        : Promise.resolve(null),
    ]);
    const byId = new Map(users.map((user) => [user.id, user]));
    const actor = byId.get(claims.sub);
    const real = realUserId ? byId.get(realUserId) : undefined;

    return {
      actorType: 'USER',
      actorId: claims.sub,
      actorEmail: actor?.email ?? claims.email ?? null,
      actorName: actor?.name ?? null,
      realActorId: realUserId,
      realActorEmail: real?.email ?? null,
      realActorName: real?.name ?? null,
      impersonatedRole: claims.impersonatingRoleId ? (role?.name ?? `#${claims.impersonatingRoleId}`) : null,
    };
  }

  private async write(
    actor: ResolvedActor,
    what: { action?: string; description?: string },
    changes: PendingAuditChange[],
    extra: Partial<Prisma.AuditEventCreateInput> = {},
  ) {
    try {
      await this.prisma.auditEvent.create({
        data: {
          ...actor,
          action: what.action ?? 'unknown',
          description: what.description ?? null,
          ...extra,
          changes: {
            create: changes.map((change) => ({
              model: change.model,
              entityId: change.entityId,
              operation: change.operation,
              before: json(change.before),
              after: json(change.after),
              changedFields: change.changedFields,
            })),
          },
        },
      });
    } catch (error) {
      // The audit log must never break what is being logged
      this.logger.error(`Could not write audit entry ${what.action}`, error instanceof Error ? error.stack : String(error));
    }
  }

  // --------------- Reading the log ---------------

  async list(query: AuditLogQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where = this.buildWhere(query);

    const [items, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        include: { changes: { orderBy: { id: 'asc' } } },
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async filterOptions() {
    const [actions, models] = await Promise.all([
      this.prisma.auditEvent.groupBy({
        by: ['action'],
        _count: { _all: true },
        _max: { description: true },
        orderBy: { action: 'asc' },
      }),
      this.prisma.auditChange.findMany({ distinct: ['model'], select: { model: true }, orderBy: { model: 'asc' } }),
    ]);

    return {
      actions: actions.map((a) => ({ action: a.action, description: a._max.description ?? null, count: a._count._all })),
      models: models.map((m) => m.model),
    };
  }

  private buildWhere(query: AuditLogQueryDto): Prisma.AuditEventWhereInput {
    const and: Prisma.AuditEventWhereInput[] = [];

    if (query.actorId !== undefined) and.push({ OR: [{ actorId: query.actorId }, { realActorId: query.actorId }] });
    if (query.actorType) and.push({ actorType: query.actorType });
    if (query.action) and.push({ action: query.action });
    if (query.success) and.push({ success: query.success === 'true' });

    if (query.model) {
      and.push({ changes: { some: { model: query.model, ...(query.entityId ? { entityId: query.entityId } : {}) } } });
    }

    if (query.from || query.to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.from) createdAt.gte = new Date(query.from);
      if (query.to) createdAt.lt = new Date(query.to);
      and.push({ createdAt });
    }

    const search = query.search?.trim();
    if (search) {
      const contains = { contains: search, mode: 'insensitive' as const };
      and.push({
        OR: [
          { actorEmail: contains },
          { actorName: contains },
          { realActorEmail: contains },
          { realActorName: contains },
          { action: contains },
          { description: contains },
          { path: contains },
        ],
      });
    }

    return and.length > 0 ? { AND: and } : {};
  }
}
