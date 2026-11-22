import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { AuditFilterOptionsDto, AuditLogPageDto, AuditLogQueryDto } from '../../dtos/audit/audit.dto.js';
import { AuditService } from './audit.service.js';

/** Read-only on purpose: nobody can change or remove what the audit log recorded. */
@ApiTags('Audit log')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermissions('audit.view')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit log entries, newest first' })
  @ApiOkResponse({ type: AuditLogPageDto })
  list(@Query() query: AuditLogQueryDto) {
    return this.audit.list(query);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Actions and data types that occur in the audit log, for filtering' })
  @ApiOkResponse({ type: AuditFilterOptionsDto })
  filters() {
    return this.audit.filterOptions();
  }
}
