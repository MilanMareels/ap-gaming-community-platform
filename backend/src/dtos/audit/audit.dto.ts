import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const AUDIT_ACTOR_TYPES = ['USER', 'ANONYMOUS', 'SYSTEM'] as const;

export class AuditLogQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @ApiProperty({ required: false, description: 'Searches who did it, the action, its description and the URL' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiProperty({ required: false, description: 'Actions by this user, also while they impersonated someone else' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  actorId?: number;

  @ApiProperty({ required: false, enum: AUDIT_ACTOR_TYPES })
  @IsOptional()
  @IsIn(AUDIT_ACTOR_TYPES)
  actorType?: (typeof AUDIT_ACTOR_TYPES)[number];

  @ApiProperty({ required: false, example: 'reservations.updateStatus' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  action?: string;

  @ApiProperty({ required: false, description: 'Only actions that changed a row of this model', example: 'Reservation' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiProperty({ required: false, description: 'With model: the history of one row', example: '42' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityId?: string;

  @ApiProperty({ required: false, enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  success?: 'true' | 'false';

  @ApiProperty({ required: false, example: '2026-10-31T23:00:00.000Z', description: 'From this moment (inclusive)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({ required: false, example: '2026-11-30T23:00:00.000Z', description: 'Until this moment (exclusive)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AuditChangeDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ example: 'Reservation' })
  model!: string;

  @ApiProperty({ type: String, nullable: true, example: '42' })
  entityId!: string | null;

  @ApiProperty({ example: 'update' })
  operation!: string;

  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  before!: Record<string, unknown> | null;

  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  after!: Record<string, unknown> | null;

  @ApiProperty({ type: [String] })
  changedFields!: string[];
}

export class AuditEventDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ enum: AUDIT_ACTOR_TYPES })
  actorType!: (typeof AUDIT_ACTOR_TYPES)[number];

  @ApiProperty({ type: Number, nullable: true })
  actorId!: number | null;

  @ApiProperty({ type: String, nullable: true })
  actorEmail!: string | null;

  @ApiProperty({ type: String, nullable: true })
  actorName!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  realActorId!: number | null;

  @ApiProperty({ type: String, nullable: true })
  realActorEmail!: string | null;

  @ApiProperty({ type: String, nullable: true })
  realActorName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  impersonatedRole!: string | null;

  @ApiProperty({ example: 'reservations.updateStatus' })
  action!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true })
  method!: string | null;

  @ApiProperty({ type: String, nullable: true })
  path!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  statusCode!: number | null;

  @ApiProperty()
  success!: boolean;

  @ApiProperty({ type: String, nullable: true })
  error!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  durationMs!: number | null;

  @ApiProperty({ type: String, nullable: true })
  ip!: string | null;

  @ApiProperty({ type: String, nullable: true })
  userAgent!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  request!: Record<string, unknown> | null;

  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  details!: Record<string, unknown> | null;

  @ApiProperty({ type: [AuditChangeDto] })
  changes!: AuditChangeDto[];
}

export class AuditLogPageDto {
  @ApiProperty({ type: [AuditEventDto] })
  items!: AuditEventDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class AuditActionOptionDto {
  @ApiProperty({ example: 'reservations.updateStatus' })
  action!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty()
  count!: number;
}

export class AuditFilterOptionsDto {
  @ApiProperty({ type: [AuditActionOptionDto] })
  actions!: AuditActionOptionDto[];

  @ApiProperty({ type: [String], example: ['Reservation', 'Role'] })
  models!: string[];
}
