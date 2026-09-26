import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NavLink {

  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  label: string;

  @ApiPropertyOptional({ type: String })
  href: string | null;

  @ApiPropertyOptional({ type: String })
  icon: string | null;

  @ApiPropertyOptional({ type: Number })
  parentId: number | null;

  @ApiProperty({ type: Number })
  position: number;

  @ApiProperty({ type: String })
  visibility: string = 'public';

  @ApiProperty({ type: Boolean })
  isCta: boolean = false;

  @ApiProperty({ type: Boolean })
  openInNewTab: boolean = false;

  @ApiProperty({ type: Boolean })
  isProtected: boolean = false;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
