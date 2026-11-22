import { Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { recordAuditChanges, type PendingAuditChange } from './audit-context.js';
import { changedFields, sanitizeForAudit, sanitizeRecord } from './audit-sanitize.js';

type Row = Record<string, unknown>;

const WRITE_OPERATIONS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
  'delete',
  'deleteMany',
]);

/** The audit log itself is never audited. */
const UNAUDITED_MODELS = new Set(['AuditEvent', 'AuditChange']);

/** Rows to remember per bulk operation: enough for any real admin action, bounded for a runaway one. */
export const MAX_ROWS_PER_OPERATION = 500;

const logger = new Logger('AuditPrismaExtension');

/** Reads the current version of rows, outside the write that is about to happen. */
export type AuditRowReader = {
  findUnique(model: string, where: unknown): Promise<Row | null>;
  findMany(model: string, where: unknown, take: number): Promise<Row[]>;
};

export type AuditedOperation = {
  model: string;
  operation: string;
  args: Record<string, unknown>;
  result: unknown;
  /** The rows as they were before the write, when they could be read */
  before?: Row[];
};

function lowerFirst(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

const scalarFieldCache = new Map<string, Set<string> | null>();

/** The model's own columns (no relations), from the generated client, so included relations stay out of snapshots. */
export function scalarFieldsOf(model: string): Set<string> | null {
  if (!scalarFieldCache.has(model)) {
    const fieldEnum = (Prisma as unknown as Record<string, unknown>)[`${model}ScalarFieldEnum`];
    scalarFieldCache.set(model, fieldEnum && typeof fieldEnum === 'object' ? new Set(Object.values(fieldEnum as Record<string, string>)) : null);
  }
  return scalarFieldCache.get(model) ?? null;
}

function isPlainObject(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

/** The columns of a row or of a write's `data`, leaving out relations and nested writes. */
function pickScalars(model: string, value: unknown, fromData = false): Row {
  if (!isPlainObject(value)) return {};
  const fields = scalarFieldsOf(model);
  const result: Row = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) continue;
    if (fields ? !fields.has(key) : isPlainObject(entry) || (Array.isArray(entry) && entry.some(isPlainObject))) continue;
    // In `data`, an object on a column is an operation like { increment: 1 }: the result has the real value
    if (
      fromData &&
      isPlainObject(entry) &&
      ('set' in entry || 'increment' in entry || 'decrement' in entry || 'multiply' in entry || 'divide' in entry)
    ) {
      if ('set' in entry) result[key] = entry.set;
      continue;
    }
    result[key] = entry;
  }
  return result;
}

function entityIdOf(...rows: (Row | null | undefined)[]): string | null {
  for (const row of rows) {
    const id = row?.id;
    if (id !== undefined && id !== null) return String(id);
  }
  return null;
}

function change(model: string, operation: string, before: Row | null, after: Row | null, fields: string[]): PendingAuditChange {
  return {
    model,
    operation,
    entityId: entityIdOf(after, before),
    before: sanitizeRecord(before),
    after: sanitizeRecord(after),
    changedFields: fields,
  };
}

/** What a bulk write did when the affected rows couldn't be read first. */
function bulkSummary(model: string, operation: string, args: Row, result: unknown, truncatedAfter?: number): PendingAuditChange {
  const count = isPlainObject(result) && typeof result.count === 'number' ? result.count : Array.isArray(result) ? result.length : undefined;
  const summary: Row = { _where: args.where ?? null, _count: count ?? null };
  if (args.data !== undefined && operation !== 'createMany') summary._data = pickScalars(model, args.data, true);
  if (truncatedAfter !== undefined) summary._onlyFirstRowsLogged = truncatedAfter;
  return {
    model,
    operation,
    entityId: null,
    before: null,
    after: sanitizeForAudit(summary) as Row,
    changedFields: operation.startsWith('update') && isPlainObject(args.data) ? Object.keys(pickScalars(model, args.data, true)).sort() : [],
  };
}

/** Turns one write into the change records that describe it. Pure, so it can be tested without a database. */
export function buildAuditChanges({ model, operation, args, result, before }: AuditedOperation): PendingAuditChange[] {
  const data = args.data;
  const resultRow = isPlainObject(result) ? pickScalars(model, result) : undefined;

  switch (operation) {
    case 'create':
      return [change(model, 'create', null, { ...pickScalars(model, data, true), ...resultRow }, [])];

    case 'createMany':
    case 'createManyAndReturn': {
      const rows = Array.isArray(result) ? (result as Row[]) : Array.isArray(data) ? (data as Row[]) : [data as Row];
      const changes = rows.slice(0, MAX_ROWS_PER_OPERATION).map((row) => change(model, 'create', null, pickScalars(model, row, true), []));
      if (rows.length > MAX_ROWS_PER_OPERATION) changes.push(bulkSummary(model, operation, args, result, MAX_ROWS_PER_OPERATION));
      return changes;
    }

    case 'update':
    case 'upsert': {
      const previous = before?.[0] ? pickScalars(model, before[0]) : undefined;
      if (operation === 'upsert' && before && !previous) {
        return [change(model, 'create', null, { ...pickScalars(model, args.create, true), ...resultRow }, [])];
      }
      const patch = pickScalars(model, operation === 'upsert' ? args.update : data, true);
      const next = { ...previous, ...patch, ...resultRow };
      if (!previous && operation === 'upsert') {
        // Not known whether it created or updated the row
        return [change(model, 'upsert', null, { ...pickScalars(model, args.create, true), ...next }, Object.keys(patch).sort())];
      }
      if (!previous) {
        // Without the old version only the fields that were written are known
        return [change(model, 'update', null, next, Object.keys(patch).sort())];
      }
      const fields = changedFields(previous, next);
      return fields.length === 0 ? [] : [change(model, 'update', previous, next, fields)];
    }

    case 'updateMany':
    case 'updateManyAndReturn': {
      if (!before) return [bulkSummary(model, operation, args, result)];
      const patch = pickScalars(model, data, true);
      const returned = new Map((Array.isArray(result) ? (result as Row[]) : []).map((row) => [entityIdOf(row), pickScalars(model, row)] as const));
      const changes = before.slice(0, MAX_ROWS_PER_OPERATION).flatMap((row) => {
        const previous = pickScalars(model, row);
        const next = { ...previous, ...patch, ...returned.get(entityIdOf(row)) };
        const fields = changedFields(previous, next);
        return fields.length === 0 ? [] : [change(model, 'update', previous, next, fields)];
      });
      if (before.length > MAX_ROWS_PER_OPERATION) changes.push(bulkSummary(model, operation, args, result, MAX_ROWS_PER_OPERATION));
      return changes;
    }

    case 'delete': {
      const previous = before?.[0] ?? (result as Row | undefined);
      return [change(model, 'delete', previous ? pickScalars(model, previous) : null, null, [])];
    }

    case 'deleteMany': {
      if (!before) return [bulkSummary(model, operation, args, result)];
      const changes = before.slice(0, MAX_ROWS_PER_OPERATION).map((row) => change(model, 'delete', pickScalars(model, row), null, []));
      if (before.length > MAX_ROWS_PER_OPERATION) changes.push(bulkSummary(model, operation, args, result, MAX_ROWS_PER_OPERATION));
      return changes;
    }

    default:
      return [];
  }
}

/** Reads the rows a write is about to touch, so the audit entry can show what they were before. */
async function readBefore(reader: AuditRowReader, model: string, operation: string, args: Row): Promise<Row[] | undefined> {
  switch (operation) {
    case 'update':
    case 'upsert':
    case 'delete': {
      const row = await reader.findUnique(model, args.where);
      return row ? [row] : [];
    }
    case 'updateMany':
    case 'updateManyAndReturn':
    case 'deleteMany':
      // One extra row tells us the list was cut short
      return reader.findMany(model, args.where, MAX_ROWS_PER_OPERATION + 1);
    default:
      return undefined;
  }
}

let warnedAboutInternals = false;

/**
 * Prisma extension that records every write to the audit log of the action it is part of.
 *
 * Rows are read before the write so the log shows what changed, except inside a batch transaction
 * (`$transaction([...])`): Prisma sends a batch on the next tick, so awaiting anything before the write
 * would split it. There only the written values are logged; services that replace whole sets of rows in a
 * batch describe what changed themselves with describeAudit().
 */
export function createAuditExtension(reader: AuditRowReader) {
  return Prisma.defineExtension({
    name: 'audit-log',
    query: {
      $allModels: {
        async $allOperations(params) {
          const { model, operation, args, query } = params;
          if (!model || !WRITE_OPERATIONS.has(operation) || UNAUDITED_MODELS.has(model)) {
            return query(args);
          }

          const internal = (params as unknown as { __internalParams?: { transaction?: { kind?: string } } }).__internalParams;
          if (!internal && !warnedAboutInternals) {
            warnedAboutInternals = true;
            logger.warn('Prisma no longer exposes transaction info to extensions: the audit log will not record values from before a change');
          }
          const canReadBefore = internal !== undefined && internal.transaction?.kind !== 'batch';

          let before: Row[] | undefined;
          if (canReadBefore) {
            try {
              before = await readBefore(reader, model, operation, (args ?? {}) as Row);
            } catch (error) {
              logger.warn(`Could not read ${model} before ${operation}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }

          const result = await query(args);

          try {
            recordAuditChanges(buildAuditChanges({ model, operation, args: (args ?? {}) as Row, result, before }));
          } catch (error) {
            logger.error(`Could not record ${model}.${operation} in the audit log`, error instanceof Error ? error.stack : String(error));
          }

          return result;
        },
      },
    },
  });
}

/** Reads rows through a client that has no audit extension, so reading never logs anything. */
export function createAuditRowReader(client: object): AuditRowReader {
  const delegate = (model: string) =>
    (client as Record<string, { findUnique(a: unknown): Promise<Row | null>; findMany(a: unknown): Promise<Row[]> }>)[lowerFirst(model)];
  return {
    findUnique: (model, where) => delegate(model).findUnique({ where }),
    findMany: (model, where, take) => delegate(model).findMany({ where, take }),
  };
}
