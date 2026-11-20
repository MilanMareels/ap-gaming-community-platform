import { ApiProperty } from '@nestjs/swagger';
import { RosterEntry } from './roster_entry.js';

export class PlayerAvailabilityRelations {

  @ApiProperty({ type: () => RosterEntry })
  rosterEntry: RosterEntry;
}
