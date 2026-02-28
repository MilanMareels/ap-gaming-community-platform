import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthUrlResponseDto {
  @ApiProperty({
    description: 'Google OAuth login URL',
    example: 'https://accounts.google.com/o/oauth2/v2/auth?...',
  })
  url!: string;
}
