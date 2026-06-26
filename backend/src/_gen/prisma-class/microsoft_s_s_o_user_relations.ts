import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.js';

export class MicrosoftSSOUserRelations {

  @ApiProperty({ type: () => User })
  user: User;
}
