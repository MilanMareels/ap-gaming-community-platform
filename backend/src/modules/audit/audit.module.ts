import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { AuditService } from './audit.service.js';
import { AuditController } from './audit.controller.js';
import { AuditMiddleware } from './audit.middleware.js';
import { AuditActionGuard } from './audit-action.guard.js';
import { AuditExceptionFilter } from './audit-exception.filter.js';

/**
 * Audit log of everything that happens on the site. Every API call that changes something is logged with
 * who did it (and who was really behind it while impersonating), and every database row it created,
 * changed or deleted is logged with its values before and after. See audit-prisma.extension.ts.
 */
@Global()
@Module({
  imports: [AuthModule, RbacModule],
  controllers: [AuditController],
  providers: [AuditService, { provide: APP_GUARD, useClass: AuditActionGuard }, { provide: APP_FILTER, useClass: AuditExceptionFilter }],
  exports: [AuditService],
})
export class AuditModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditMiddleware).forRoutes('{*path}');
  }
}
