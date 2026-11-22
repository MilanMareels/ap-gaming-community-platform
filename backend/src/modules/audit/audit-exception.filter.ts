import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { currentAuditContext } from './audit-context.js';

/** Why an action failed, in words: the message of an HTTP error, or that something broke on the server. */
export function auditErrorMessage(exception: unknown): string {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    const message = (response as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join('; ');
    if (typeof message === 'string') return message;
    return exception.message;
  }
  return `Serverfout: ${exception instanceof Error ? exception.message : String(exception)}`;
}

/** Records why a request failed on its audit entry, then answers exactly like Nest would. */
@Catch()
export class AuditExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = currentAuditContext();
    if (ctx) ctx.error = auditErrorMessage(exception);
    super.catch(exception, host);
  }
}
