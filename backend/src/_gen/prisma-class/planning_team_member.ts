import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanningTeamMember {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  teamId: number;

  @ApiProperty({ type: Number })
  userId: number;

  @ApiPropertyOptional({ type: String })
  handle: string | null;

  @ApiProperty({ type: Boolean })
  isPlayer: boolean = true;

  @ApiProperty({ type: Boolean })
  isManager: boolean = false;

  @ApiProperty({ type: Number })
  order: number = 0;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
