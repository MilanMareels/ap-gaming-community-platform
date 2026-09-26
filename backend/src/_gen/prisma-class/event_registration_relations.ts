import { ApiProperty } from '@nestjs/swagger';
import { Event } from './event.js';
import { User } from './user.js';

export class EventRegistrationRelations {

  @ApiProperty({ type: () => Event })
  event: Event;

  @ApiProperty({ type: () => User })
  user: User;
}
