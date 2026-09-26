import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NavLink } from './nav_link.js';

export class NavLinkRelations {

  @ApiPropertyOptional({ type: () => NavLink })
  parent: NavLink | null;

  @ApiProperty({ isArray: true, type: () => NavLink })
  children: NavLink[];
}
