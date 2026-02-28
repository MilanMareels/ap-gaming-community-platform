import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.js';

export class GoogleSSOUserRelations {

  @ApiProperty({ type: () => User })
  user: User;
}
