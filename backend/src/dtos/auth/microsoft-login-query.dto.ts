import { ApiProperty } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class MicrosoftLoginQueryDto {
  @ApiProperty({
    description: 'Frontend return URL path to preserve after login',
    required: false,
    example: '/admin/reservations',
  })
  @IsOptional()
  @IsString()
  returnUrl?: string;

  @ApiProperty({
    description: 'If true, treat callback as a link-account flow for the currently authenticated user',
    required: false,
    example: 'true',
  })
  @IsOptional()
  @IsBooleanString()
  linkMode?: string;
}
