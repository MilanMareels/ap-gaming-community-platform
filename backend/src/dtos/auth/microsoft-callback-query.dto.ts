import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MicrosoftCallbackQueryDto {
  @ApiProperty({
    description: 'OAuth authorization code returned by Microsoft',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'Opaque state value sent during login request (base64 JSON: { returnUrl, linkMode })',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    description: 'Session state from Microsoft',
    required: false,
  })
  @IsOptional()
  @IsString()
  session_state?: string;
}
