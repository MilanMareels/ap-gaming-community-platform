import { UserNoteType } from '../../generated/prisma/enums.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserNote {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  userId: number;

  @ApiProperty({ type: Number })
  authorId: number;

  @ApiProperty({ enum: UserNoteType, enumName: 'UserNoteType' })
  type: UserNoteType = UserNoteType.NOTE;

  @ApiProperty({ type: String })
  content: string;

  @ApiPropertyOptional({ type: Date })
  expiresAt: Date | null;

  @ApiPropertyOptional({ type: Date })
  emailedAt: Date | null;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
