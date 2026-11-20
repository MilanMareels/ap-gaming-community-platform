import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.js';
import { RosterGame } from './roster_game.js';

export class RosterEntryRelations {

  @ApiProperty({ type: () => User })
  user: User;

  @ApiProperty({ type: () => RosterGame })
  game: RosterGame;
}
