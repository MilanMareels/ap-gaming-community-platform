import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: ['Validation failed'] })
  message!: string[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;
}
