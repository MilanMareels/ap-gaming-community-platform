import { ApiPropertyOptional } from '@nestjs/swagger';
import { DynamicForm } from './dynamic_form.js';

export class JobRelations {

  @ApiPropertyOptional({ type: () => DynamicForm })
  form: DynamicForm | null;
}
