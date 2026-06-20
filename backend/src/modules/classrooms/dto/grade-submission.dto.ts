import { IsOptional, IsNumber, IsString, IsEnum, Min, Max } from 'class-validator';
import { SubmissionStatus } from '@prisma/client';

export class GradeSubmissionDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  score?: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;
}
