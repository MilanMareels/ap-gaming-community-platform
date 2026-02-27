import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.js';

export class AdminUserRelations {

  @ApiProperty({ type: () => User })
  user: User;
}
