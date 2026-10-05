import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DynamicFormSubmission } from './dynamic_form_submission.js';
import { User } from './user.js';

export class DynamicFormSubmissionCommentRelations {

  @ApiProperty({ type: () => DynamicFormSubmission })
  submission: DynamicFormSubmission;

  @ApiPropertyOptional({ type: () => User })
  user: User | null;
}
