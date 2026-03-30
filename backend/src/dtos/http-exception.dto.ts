import { ApiProperty } from '@nestjs/swagger';

export class HttpExceptionDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Validation or business rule violation', oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;
}
