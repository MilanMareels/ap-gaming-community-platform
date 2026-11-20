import { ApiProperty } from '@nestjs/swagger';
import { RosterEntry } from './roster_entry.js';
import { EsportsMatch } from './esports_match.js';

export class RosterGameRelations {

  @ApiProperty({ isArray: true, type: () => RosterEntry })
  rosterEntries: RosterEntry[];

  @ApiProperty({ isArray: true, type: () => EsportsMatch })
  matches: EsportsMatch[];
}
