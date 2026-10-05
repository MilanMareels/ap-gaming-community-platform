import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DynamicFormSubmissionComment {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  submissionId: number;

  @ApiPropertyOptional({ type: Number })
  userId: number | null;

  @ApiPropertyOptional({ type: String })
  authorName: string | null;

  @ApiProperty({ type: String })
  content: string;

  @ApiProperty({ type: Boolean })
  isAdmin: boolean = false;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
