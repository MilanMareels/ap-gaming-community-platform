import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DiscordWebhookService {
  private readonly logger = new Logger('DiscordWebhookService');

  async sendSubmissionNotification(
    webhookUrl: string,
    formTitle: string,
    submitterInfo: string,
    adminUrl: string,
  ) {
    try {
      const embed = {
        title: `Nieuwe inzending: ${formTitle}`,
        description: `Er is een nieuwe inzending ontvangen.\n\n[Bekijk in admin panel](${adminUrl})`,
        color: 0xdc2626,
        footer: { text: `Ingediend door ${submitterInfo}` },
        timestamp: new Date().toISOString(),
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });

      this.logger.log(`Discord webhook sent for form "${formTitle}"`);
    } catch (error) {
      this.logger.error(`Discord webhook failed: ${error}`);
    }
  }
}
