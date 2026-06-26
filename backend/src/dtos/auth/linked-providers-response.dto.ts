import { ApiProperty } from '@nestjs/swagger';

export class LinkedProviderDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  ssoId!: string;
}

export class LinkedProvidersResponseDto {
  @ApiProperty({ type: [LinkedProviderDto] })
  google!: LinkedProviderDto[];

  @ApiProperty({ type: [LinkedProviderDto] })
  microsoft!: LinkedProviderDto[];
}
