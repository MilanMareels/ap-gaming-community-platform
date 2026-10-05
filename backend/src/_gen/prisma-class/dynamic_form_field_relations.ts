import { ApiProperty } from '@nestjs/swagger';
import { DynamicForm } from './dynamic_form.js';
import { DynamicFormSubmissionAnswer } from './dynamic_form_submission_answer.js';

export class DynamicFormFieldRelations {

  @ApiProperty({ type: () => DynamicForm })
  form: DynamicForm;

  @ApiProperty({ isArray: true, type: () => DynamicFormSubmissionAnswer })
  answers: DynamicFormSubmissionAnswer[];
}
