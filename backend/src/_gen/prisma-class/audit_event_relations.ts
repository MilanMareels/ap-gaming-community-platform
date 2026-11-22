import { ApiProperty } from '@nestjs/swagger';
import { AuditChange } from './audit_change.js';

export class AuditEventRelations {

  @ApiProperty({ isArray: true, type: () => AuditChange })
  changes: AuditChange[];
}
