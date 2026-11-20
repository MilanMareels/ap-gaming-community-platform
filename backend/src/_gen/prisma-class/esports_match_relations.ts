import { ApiProperty } from '@nestjs/swagger';
import { RosterGame } from './roster_game.js';

export class EsportsMatchRelations {

  @ApiProperty({ type: () => RosterGame })
  game: RosterGame;
}
