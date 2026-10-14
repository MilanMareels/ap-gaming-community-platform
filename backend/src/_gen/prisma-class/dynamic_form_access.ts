import { ApiProperty } from '@nestjs/swagger';

export class DynamicFormAccess {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  formId: number;

  @ApiProperty({ type: Number })
  roleId: number;
}
