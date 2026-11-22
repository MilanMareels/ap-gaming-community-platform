import { AuditActorType } from '../../generated/prisma/enums.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditEvent {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ enum: AuditActorType, enumName: 'AuditActorType' })
  actorType: AuditActorType;

  @ApiPropertyOptional({ type: Number })
  actorId: number | null;

  @ApiPropertyOptional({ type: String })
  actorEmail: string | null;

  @ApiPropertyOptional({ type: String })
  actorName: string | null;

  @ApiPropertyOptional({ type: Number })
  realActorId: number | null;

  @ApiPropertyOptional({ type: String })
  realActorEmail: string | null;

  @ApiPropertyOptional({ type: String })
  realActorName: string | null;

  @ApiPropertyOptional({ type: String })
  impersonatedRole: string | null;

  @ApiProperty({ type: String })
  action: string;

  @ApiPropertyOptional({ type: String })
  description: string | null;

  @ApiPropertyOptional({ type: String })
  method: string | null;

  @ApiPropertyOptional({ type: String })
  path: string | null;

  @ApiPropertyOptional({ type: Number })
  statusCode: number | null;

  @ApiProperty({ type: Boolean })
  success: boolean = true;

  @ApiPropertyOptional({ type: String })
  error: string | null;

  @ApiPropertyOptional({ type: Number })
  durationMs: number | null;

  @ApiPropertyOptional({ type: String })
  ip: string | null;

  @ApiPropertyOptional({ type: String })
  userAgent: string | null;

  @ApiPropertyOptional({ type: Object })
  request: any | null;

  @ApiPropertyOptional({ type: Object })
  details: any | null;
}
