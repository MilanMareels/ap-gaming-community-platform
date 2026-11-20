import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.js';
import { RosterGame } from './roster_game.js';
import { PlayerAvailability } from './player_availability.js';

export class RosterEntryRelations {

  @ApiProperty({ type: () => User })
  user: User;

  @ApiProperty({ type: () => RosterGame })
  game: RosterGame;

  @ApiProperty({ isArray: true, type: () => PlayerAvailability })
  availability: PlayerAvailability[];
}
