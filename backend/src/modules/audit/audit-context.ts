import { AsyncLocalStorage } from 'node:async_hooks';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

/** One database row that was created, changed or deleted, waiting to be written with its audit event. */
export type PendingAuditChange = {
  model: string;
  entityId: string | null;
  operation: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changedFields: string[];
};

/** Who an audit entry is attributed to when it isn't the user on the request (e.g. the user who just logged in). */
export type AuditActorClaims = Pick<JwtPayload, 'sub' | 'email'> & Partial<Pick<JwtPayload, 'realUserId' | 'impersonatingRoleId'>>;

/** Everything collected about one action while it runs: one HTTP request or one scheduled job. */
export type AuditContext = {
  kind: 'request' | 'system';
  /** e.g. "reservations.updateStatus", set once the route handler is known */
  action?: string;
  description?: string;
  actor?: AuditActorClaims;
  details: Record<string, unknown>;
  changes: PendingAuditChange[];
  /** Write the entry even if the request would normally not be logged (a GET without changes) */
  force: boolean;
  error?: string;
  startedAt: number;
};

export const auditStorage = new AsyncLocalStorage<AuditContext>();

export function createAuditContext(kind: AuditContext['kind'], action?: string, description?: string): AuditContext {
  return { kind, action, description, details: {}, changes: [], force: false, startedAt: Date.now() };
}

export function currentAuditContext(): AuditContext | undefined {
  return auditStorage.getStore();
}

/**
 * Adds human readable context to the audit entry of the current action, such as which permissions were
 * added to a role. Also makes sure the action is logged even when it changed nothing.
 */
export function describeAudit(details: Record<string, unknown>) {
  const ctx = auditStorage.getStore();
  if (!ctx) return;
  Object.assign(ctx.details, details);
  ctx.force = true;
}

/** Attributes the current action to someone other than the request's user, e.g. the user who just logged in. */
export function setAuditActor(actor: AuditActorClaims) {
  const ctx = auditStorage.getStore();
  if (!ctx) return;
  ctx.actor = actor;
  ctx.force = true;
}

type OrphanHandler = (changes: PendingAuditChange[]) => void;
let orphanHandler: OrphanHandler | undefined;

/** Where changes go that happen outside any request or job, so they are still logged. */
export function setOrphanAuditHandler(handler: OrphanHandler | undefined) {
  orphanHandler = handler;
}

export function recordAuditChanges(changes: PendingAuditChange[]) {
  if (changes.length === 0) return;
  const ctx = auditStorage.getStore();
  if (ctx) {
    ctx.changes.push(...changes);
  } else {
    orphanHandler?.(changes);
  }
}
