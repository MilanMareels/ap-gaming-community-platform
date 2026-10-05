import { FormFieldType } from '../../generated/prisma/enums.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DynamicFormField {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  formId: number;

  @ApiProperty({ enum: FormFieldType, enumName: 'FormFieldType' })
  type: FormFieldType;

  @ApiProperty({ type: String })
  label: string;

  @ApiProperty({ type: Boolean })
  required: boolean = false;

  @ApiProperty({ type: Number })
  position: number;

  @ApiPropertyOptional({ type: Object })
  config: any | null;
}
