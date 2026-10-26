import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReservationsService } from '../reservations/reservations.service.js';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly reservationsService: ReservationsService) {}

  /** Run every 5 minutes: mark RESERVED reservations as NO_SHOW when 15 min past start time. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleOverdueNoShows() {
    try {
      const count = await this.reservationsService.markOverdueNoShows();
      if (count > 0) {
        this.logger.log(`Marked ${count} overdue reservation(s) as no-show`);
      }
    } catch (error) {
      this.logger.error('Failed to process overdue no-shows', error instanceof Error ? error.stack : String(error));
    }
  }
}
