import { ApiProperty } from '@nestjs/swagger';
import { DynamicFormSubmission } from './dynamic_form_submission.js';
import { DynamicFormField } from './dynamic_form_field.js';

export class DynamicFormSubmissionAnswerRelations {

  @ApiProperty({ type: () => DynamicFormSubmission })
  submission: DynamicFormSubmission;

  @ApiProperty({ type: () => DynamicFormField })
  field: DynamicFormField;
}
