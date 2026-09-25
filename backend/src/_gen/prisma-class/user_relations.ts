import { ApiProperty } from '@nestjs/swagger';
import { Reservation } from './reservation.js';
import { AdminUser } from './admin_user.js';
import { GoogleSSOUser } from './google_s_s_o_user.js';
import { MicrosoftSSOUser } from './microsoft_s_s_o_user.js';
import { RosterEntry } from './roster_entry.js';
import { EventRegistration } from './event_registration.js';
import { BracketParticipant } from './bracket_participant.js';
import { TimeTrialParticipant } from './time_trial_participant.js';
import { PointTrialParticipant } from './point_trial_participant.js';

export class UserRelations {

  @ApiProperty({ isArray: true, type: () => Reservation })
  reservations: Reservation[];

  @ApiProperty({ isArray: true, type: () => AdminUser })
  adminUsers: AdminUser[];

  @ApiProperty({ isArray: true, type: () => GoogleSSOUser })
  googleSSOUsers: GoogleSSOUser[];

  @ApiProperty({ isArray: true, type: () => MicrosoftSSOUser })
  microsoftSSOUsers: MicrosoftSSOUser[];

  @ApiProperty({ isArray: true, type: () => RosterEntry })
  rosterEntries: RosterEntry[];

  @ApiProperty({ isArray: true, type: () => EventRegistration })
  eventRegistrations: EventRegistration[];

  @ApiProperty({ isArray: true, type: () => BracketParticipant })
  bracketParticipants: BracketParticipant[];

  @ApiProperty({ isArray: true, type: () => TimeTrialParticipant })
  timeTrialParticipants: TimeTrialParticipant[];

  @ApiProperty({ isArray: true, type: () => PointTrialParticipant })
  pointTrialParticipants: PointTrialParticipant[];
}
