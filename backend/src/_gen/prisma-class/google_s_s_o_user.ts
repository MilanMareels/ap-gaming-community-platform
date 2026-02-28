import { ApiProperty } from '@nestjs/swagger';

export class GoogleSSOUser {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  ssoId: string;

  @ApiProperty({ type: Number })
  userId: number;
}
