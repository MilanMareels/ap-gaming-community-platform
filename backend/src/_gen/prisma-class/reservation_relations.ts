import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.js';

export class ReservationRelations {

  @ApiProperty({ type: () => User })
  user: User;
}
