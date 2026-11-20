import { Module } from '@nestjs/common';
import { PeopleService } from './people.service.js';

@Module({
  providers: [PeopleService],
  exports: [PeopleService],
})
export class PeopleModule {}
