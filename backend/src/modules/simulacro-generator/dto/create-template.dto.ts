import {
  IsString, IsOptional, IsEnum, IsInt, IsArray, ValidateNested, Min, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExamType, SessionType, Difficulty, QuestionSource } from '@prisma/client';

export class CreateTemplateRuleDto {
  @IsInt()
  @Min(1)
  count: number;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

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
  @IsInt()
  gradeLevel?: number;

  @IsOptional()
  @IsEnum(QuestionSource)
  sourceType?: QuestionSource;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  excludeRecentDays?: number;
}

export class CreateTemplateSectionDto {
  @IsString()
  area: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsInt()
  @Min(0)
  durationMinutes: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateRuleDto)
  rules: CreateTemplateRuleDto[];
}

export class CreateTemplateSessionDto {
  @IsEnum(SessionType)
  type: SessionType;

  @IsString()
  label: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsInt()
  @Min(0)
  durationMinutes: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateSectionDto)
  sections: CreateTemplateSectionDto[];
}

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ExamType)
  examType: ExamType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateSessionDto)
  sessions: CreateTemplateSessionDto[];
}
