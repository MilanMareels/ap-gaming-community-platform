import { ApiProperty } from '@nestjs/swagger';

export class SpeedrunRunVariableValue {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  runId: number;

  @ApiProperty({ type: Number })
  variableId: number;

  @ApiProperty({ type: Number })
  valueId: number;
}
