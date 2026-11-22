import { ApiProperty } from '@nestjs/swagger';
import { AuditEvent } from './audit_event.js';

export class AuditChangeRelations {

  @ApiProperty({ type: () => AuditEvent })
  event: AuditEvent;
}
