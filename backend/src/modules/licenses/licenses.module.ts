import { Module } from '@nestjs/common';
import { LicensesController } from './licenses.controller';
import { LicensesService } from './licenses.service';
import { LicensesCron } from './licenses.cron';

@Module({
  controllers: [LicensesController],
  providers: [LicensesService, LicensesCron],
  exports: [LicensesService],
})
export class LicensesModule {}
