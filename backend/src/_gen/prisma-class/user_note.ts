import { ApiProperty } from '@nestjs/swagger';

export class UserNote {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  userId: number;

  @ApiProperty({ type: Number })
  authorId: number;

  @ApiProperty({ type: String })
  content: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
