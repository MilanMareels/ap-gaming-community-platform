import { ApiProperty } from '@nestjs/swagger';
import { DynamicForm } from './dynamic_form.js';
import { Role } from './role.js';

export class DynamicFormAccessRelations {

  @ApiProperty({ type: () => DynamicForm })
  form: DynamicForm;

  @ApiProperty({ type: () => Role })
  role: Role;
}
