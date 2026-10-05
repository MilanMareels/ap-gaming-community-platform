import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DynamicForm } from './dynamic_form.js';
import { User } from './user.js';
import { DynamicFormSubmissionAnswer } from './dynamic_form_submission_answer.js';
import { DynamicFormSubmissionComment } from './dynamic_form_submission_comment.js';

export class DynamicFormSubmissionRelations {

  @ApiProperty({ type: () => DynamicForm })
  form: DynamicForm;

  @ApiPropertyOptional({ type: () => User })
  user: User | null;

  @ApiProperty({ isArray: true, type: () => DynamicFormSubmissionAnswer })
  answers: DynamicFormSubmissionAnswer[];

  @ApiProperty({ isArray: true, type: () => DynamicFormSubmissionComment })
  comments: DynamicFormSubmissionComment[];
}
