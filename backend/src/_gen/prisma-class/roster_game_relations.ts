import { ApiProperty } from '@nestjs/swagger';
import { RosterEntry } from './roster_entry.js';

export class RosterGameRelations {

  @ApiProperty({ isArray: true, type: () => RosterEntry })
  rosterEntries: RosterEntry[];
}
