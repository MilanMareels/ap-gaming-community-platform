import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { currentAuditContext } from './audit-context.js';

/** Where @nestjs/swagger keeps the @ApiOperation() options of a route */
const API_OPERATION_METADATA = 'swagger/apiOperation';

/** "ReservationsController" + "updateStatus" → "reservations.updateStatus" */
export function auditActionName(controllerName: string, handlerName: string) {
  const base = controllerName.replace(/Controller$/, '');
  return `${base.charAt(0).toLowerCase()}${base.slice(1)}.${handlerName}`;
}

/**
 * Global guard that never blocks: it runs before the route's own guards, so the audit entry knows which
 * action was attempted even when a permission check turns the request away.
 */
@Injectable()
export class AuditActionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = currentAuditContext();
    if (ctx?.kind === 'request' && context.getType() === 'http') {
      const handler = context.getHandler();
      ctx.action = auditActionName(context.getClass().name, handler.name);
      const operation = Reflect.getMetadata(API_OPERATION_METADATA, handler) as { summary?: string } | undefined;
      ctx.description = operation?.summary;
    }
    return true;
  }
}
