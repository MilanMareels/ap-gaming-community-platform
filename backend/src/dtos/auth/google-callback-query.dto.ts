import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleCallbackQueryDto {
  @ApiProperty({
    description: 'OAuth authorization code returned by Google',
    example: '4/0AdQt8qh...',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'Optional state value sent during login request',
    required: false,
    example: '/dashboard',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    description: 'Issuer URL from Google',
    required: false,
  })
  @IsOptional()
  @IsString()
  iss?: string;

  @ApiProperty({
    description: 'OAuth scopes granted',
    required: false,
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiProperty({
    description: 'Authenticated user index',
    required: false,
  })
  @IsOptional()
  @IsString()
  authuser?: string;

  @ApiProperty({
    description: 'Prompt type used',
    required: false,
  })
  @IsOptional()
  @IsString()
  prompt?: string;
}
