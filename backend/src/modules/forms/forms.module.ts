import { Module } from '@nestjs/common';
import { FormsService } from './forms.service.js';
import { FormSubmissionsService } from './form-submissions.service.js';
import { DiscordWebhookService } from './discord-webhook.service.js';
import { FormsController } from './forms.controller.js';
import { FormSubmissionsController } from './form-submissions.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [AuthModule, RbacModule, MailModule],
  controllers: [FormsController, FormSubmissionsController],
  providers: [FormsService, FormSubmissionsService, DiscordWebhookService],
  exports: [FormsService],
})
export class FormsModule {}
