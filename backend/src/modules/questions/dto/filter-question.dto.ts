import { IsOptional, IsEnum, IsString, IsBoolean, IsInt, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Difficulty, ExamType, QuestionSource } from '@prisma/client';

export class FilterQuestionDto {
  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsEnum(ExamType)
  examType?: ExamType;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  subtopic?: string;

  @IsOptional()
  @IsString()
  competence?: string;

  @IsOptional()
  @IsString()
  component?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  gradeLevel?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsOptional()
  @IsEnum(QuestionSource)
  sourceType?: QuestionSource;

  @IsOptional()
  @IsString()
  tagId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
