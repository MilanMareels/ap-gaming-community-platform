import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DynamicFormSubmissionAnswer {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  submissionId: number;

  @ApiProperty({ type: Number })
  fieldId: number;

  @ApiPropertyOptional({ type: String })
  value: string | null;

  @ApiPropertyOptional({ type: Object })
  values: any | null;

  @ApiPropertyOptional({ type: String })
  filePath: string | null;

  @ApiPropertyOptional({ type: String })
  fileName: string | null;
}
