import { ApiProperty } from '@nestjs/swagger';
import { Reservation } from './reservation.js';
import { AdminUser } from './admin_user.js';
import { GoogleSSOUser } from './google_s_s_o_user.js';
import { RosterEntry } from './roster_entry.js';

export class UserRelations {

  @ApiProperty({ isArray: true, type: () => Reservation })
  reservations: Reservation[];

  @ApiProperty({ isArray: true, type: () => AdminUser })
  adminUsers: AdminUser[];

  @ApiProperty({ isArray: true, type: () => GoogleSSOUser })
  googleSSOUsers: GoogleSSOUser[];

  @ApiProperty({ isArray: true, type: () => RosterEntry })
  rosterEntries: RosterEntry[];
}
