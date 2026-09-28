import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryAdjustment {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  inventory: string;

  @ApiProperty({ type: Number })
  quantity: number;

  @ApiProperty({ type: Date })
  startTime: Date;

  @ApiProperty({ type: Date })
  endTime: Date;

  @ApiPropertyOptional({ type: String })
  reason: string | null;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
