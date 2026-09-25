import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BracketParticipant {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  bracketId: number;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String })
  email: string | null;

  @ApiPropertyOptional({ type: Number })
  userId: number | null;

  @ApiPropertyOptional({ type: Number })
  seed: number | null;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
