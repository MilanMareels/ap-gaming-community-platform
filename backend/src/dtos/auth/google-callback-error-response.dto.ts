import { ApiProperty } from '@nestjs/swagger';

export class GoogleCallbackErrorResponseDto {
  @ApiProperty({
    description: 'Reason why authentication did not complete',
    example: 'unknown_user',
  })
  reason!: string;
}
