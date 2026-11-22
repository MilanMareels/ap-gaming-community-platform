export const REDACTED = '[verborgen]';

const MAX_STRING_LENGTH = 5000;
const MAX_ARRAY_LENGTH = 200;
const MAX_DEPTH = 8;

/**
 * Keys whose values never end up in the audit log: credentials, OAuth codes, push keys and webhook URLs
 * (a Discord webhook URL is itself a secret). The fact that they changed is still logged.
 */
const SENSITIVE_KEY = /pass(word)?|secret|token|verifier|webhook|authorization|cookie|p256dh|^auth$|^code$|^state$|^endpoint$|^challenge$/i;

export function isSensitiveKey(key: string) {
  return SENSITIVE_KEY.test(key);
}

/** Turns a value into plain JSON fit for the audit log: secrets redacted, long text and lists cut short. */
export function sanitizeForAudit(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}… (${value.length} tekens)` : value;
  }
  if (typeof value !== 'object') return typeof value === 'function' ? undefined : value;
  if (Buffer.isBuffer(value)) return `[bestand, ${value.length} bytes]`;
  if (depth >= MAX_DEPTH) return '[…]';

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeForAudit(item, depth + 1));
    if (value.length > MAX_ARRAY_LENGTH) items.push(`… en nog ${value.length - MAX_ARRAY_LENGTH}`);
    return items;
  }

  // Prisma Decimal and similar types know how to serialise themselves
  const withToJson = value as { toJSON?: () => unknown };
  if (typeof withToJson.toJSON === 'function') return sanitizeForAudit(withToJson.toJSON(), depth + 1);

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) continue;
    result[key] = isSensitiveKey(key) && entry !== null && entry !== '' ? REDACTED : sanitizeForAudit(entry, depth + 1);
  }
  return result;
}

export function sanitizeRecord(value: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  return sanitizeForAudit(value) as Record<string, unknown>;
}

function comparable(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value === undefined) return 'null';
  if (typeof value === 'bigint') return JSON.stringify(value.toString());
  return JSON.stringify(value) ?? 'null';
}

/** Fields that change as a side effect of any write and say nothing about who did what. */
const BOOKKEEPING_FIELDS = new Set(['updatedAt']);

/** The fields that differ between two versions of a row, ignoring bookkeeping fields. */
export function changedFields(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => !BOOKKEEPING_FIELDS.has(key) && comparable(before[key]) !== comparable(after[key])).sort();
}
