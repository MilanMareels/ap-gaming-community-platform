import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DynamicFormSubmission {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  cuid: string;

  @ApiProperty({ type: Number })
  formId: number;

  @ApiPropertyOptional({ type: Number })
  userId: number | null;

  @ApiPropertyOptional({ type: String })
  submitterEmail: string | null;

  @ApiPropertyOptional({ type: String })
  submitterName: string | null;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
