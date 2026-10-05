import { ApiProperty } from '@nestjs/swagger';
import { DynamicFormField } from './dynamic_form_field.js';
import { DynamicFormSubmission } from './dynamic_form_submission.js';
import { Job } from './job.js';

export class DynamicFormRelations {

  @ApiProperty({ isArray: true, type: () => DynamicFormField })
  fields: DynamicFormField[];

  @ApiProperty({ isArray: true, type: () => DynamicFormSubmission })
  submissions: DynamicFormSubmission[];

  @ApiProperty({ isArray: true, type: () => Job })
  jobs: Job[];
}
