import { Module } from '@nestjs/common';
import { BracketsService } from './brackets.service.js';
import { BracketParticipantsService } from './bracket-participants.service.js';
import { BracketMatchesService } from './bracket-matches.service.js';
import { BracketGeneratorService } from './bracket-generator.service.js';
import { BracketsController } from './brackets.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [BracketsController],
  providers: [BracketsService, BracketParticipantsService, BracketMatchesService, BracketGeneratorService],
})
export class BracketsModule {}
