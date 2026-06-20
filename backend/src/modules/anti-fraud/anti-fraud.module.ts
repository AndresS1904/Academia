import { Module } from '@nestjs/common';
import { AntiFraudService } from './anti-fraud.service';
import { AntiFraudController } from './anti-fraud.controller';

@Module({
  controllers: [AntiFraudController],
  providers:   [AntiFraudService],
  exports:     [AntiFraudService],
})
export class AntiFraudModule {}
