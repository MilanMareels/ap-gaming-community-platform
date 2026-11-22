import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditChange {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  eventId: number;

  @ApiProperty({ type: String })
  model: string;

  @ApiPropertyOptional({ type: String })
  entityId: string | null;

  @ApiProperty({ type: String })
  operation: string;

  @ApiPropertyOptional({ type: Object })
  before: any | null;

  @ApiPropertyOptional({ type: Object })
  after: any | null;

  @ApiProperty({ type: [String] })
  changedFields: string[];
}
