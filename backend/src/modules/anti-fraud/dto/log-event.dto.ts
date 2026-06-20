import { IsEnum, IsOptional, IsString, IsDateString, IsObject } from 'class-validator';
import { FraudEventType } from '@prisma/client';

export class LogEventDto {
  @IsString()
  attemptId: string;

  @IsString()
  evaluationType: string;

  @IsString()
  evaluationId: string;

  @IsEnum(FraudEventType)
  eventType: FraudEventType;

  @IsOptional()
  @IsDateString()
  clientTimestamp?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
