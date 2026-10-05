import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFormDto {
  @ApiProperty({ example: 'Feedback formulier' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'Laat ons weten wat je ervan vindt.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  requiresAuth?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  confirmationEmail?: boolean;

  @ApiPropertyOptional({ example: 'https://discord.com/api/webhooks/...' })
  @IsString()
  @IsOptional()
  discordWebhookUrl?: string;
}

export class UpdateFormDto {
  @ApiPropertyOptional({ example: 'Updated title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  requiresAuth?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  confirmationEmail?: boolean;

  @ApiPropertyOptional({ example: 'https://discord.com/api/webhooks/...' })
  @IsString()
  @IsOptional()
  discordWebhookUrl?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
