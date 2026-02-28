import { ApiProperty } from '@nestjs/swagger';

export class AdminUser {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: Number })
  userId: number;
}
