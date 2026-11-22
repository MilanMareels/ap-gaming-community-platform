import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { auditStorage, createAuditContext } from './audit-context.js';
import { AuditService } from './audit.service.js';

/** Collects everything one request does, and writes its audit entry once the response is sent. */
@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(private readonly audit: AuditService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const ctx = createAuditContext('request');
    res.once('close', () => void this.audit.finishRequest(ctx, req, res));
    auditStorage.run(ctx, () => next());
  }
}
