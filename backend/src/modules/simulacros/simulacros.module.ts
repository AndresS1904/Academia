import { Module } from '@nestjs/common';
import { SimulacrosController } from './simulacros.controller';
import { SimulacrosService } from './simulacros.service';
import { AccessModule } from '../access/access.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AccessModule, AnalyticsModule],
  controllers: [SimulacrosController],
  providers: [SimulacrosService],
})
export class SimulacrosModule {}
