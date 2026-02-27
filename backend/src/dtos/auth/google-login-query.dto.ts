import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GoogleLoginQueryDto {
  @ApiProperty({
    description: 'Frontend return URL path to preserve after login',
    required: false,
    example: '/dashboard',
  })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
