import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { Difficulty, ExamType, QuestionSource, QuestionType } from '@prisma/client';

export class CreateOptionDto {
  @IsString()
  letra: string;

  @IsString()
  texto: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuestionDto {
  @IsString()
  enunciado: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  contexto?: string;

  @IsString()
  area: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsEnum(ExamType)
  examType: ExamType;

  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @IsOptional()
  @IsString()
  explicacion?: string;

  // Metadata académica
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
  @IsInt()
  year?: number;

  @IsOptional()
  @IsEnum(QuestionSource)
  sourceType?: QuestionSource;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options: CreateOptionDto[];
}
