import { ApiProperty } from '@nestjs/swagger';

export class SpeedrunVariableValue {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  variableId: number;

  @ApiProperty({ type: String })
  label: string;

  @ApiProperty({ type: Boolean })
  isDefault: boolean = false;

  @ApiProperty({ type: Number })
  position: number;
}
