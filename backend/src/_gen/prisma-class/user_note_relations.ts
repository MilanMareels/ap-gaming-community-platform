import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.js';

export class UserNoteRelations {

  @ApiProperty({ type: () => User })
  user: User;

  @ApiProperty({ type: () => User })
  author: User;
}
