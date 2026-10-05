import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Job {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String })
  shortDescription: string = '';

  @ApiProperty({ type: String })
  description: string;

  @ApiProperty({ type: Boolean })
  isActive: boolean = true;

  @ApiPropertyOptional({ type: Number })
  formId: number | null;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
