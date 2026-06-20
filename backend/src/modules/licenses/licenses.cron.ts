import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LicensesService } from './licenses.service';

@Injectable()
export class LicensesCron {
  private readonly logger = new Logger(LicensesCron.name);

  constructor(private licenses: LicensesService) {}

  /** Ejecuta cada noche a las 02:00 — expira licencias vencidas */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async expireOverdue() {
    const result = await this.licenses.expireOverdue();
    if (result.expired > 0) {
      this.logger.log(`Licencias expiradas: ${result.expired}`);
    }
  }
}
