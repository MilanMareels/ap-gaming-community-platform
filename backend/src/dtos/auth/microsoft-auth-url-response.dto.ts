import { ApiProperty } from '@nestjs/swagger';

export class MicrosoftAuthUrlResponseDto {
  @ApiProperty({
    description: 'Microsoft OAuth login URL',
    example: 'https://login.microsoftonline.com/.../oauth2/v2.0/authorize?...',
  })
  url!: string;
}
