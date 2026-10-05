import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DynamicForm {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  cuid: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiPropertyOptional({ type: String })
  description: string | null;

  @ApiProperty({ type: Boolean })
  requiresAuth: boolean = false;

  @ApiProperty({ type: Boolean })
  confirmationEmail: boolean = true;

  @ApiPropertyOptional({ type: String })
  discordWebhookUrl: string | null;

  @ApiProperty({ type: Boolean })
  isActive: boolean = true;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
