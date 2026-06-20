import { IsString, IsOptional, IsEnum, IsInt, IsArray, ValidateNested, Min, ArrayMinSize, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ExamType, SessionType, Difficulty } from '@prisma/client';

export class SectionConfigDto {
  @IsString()
  area: string;

  @IsInt()
  @Min(1)
  questionCount: number;

  @IsInt()
  @Min(0)
  duracionMinutos: number;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;
}

export class SessionConfigDto {
  @IsEnum(SessionType)
  type: SessionType;

  @IsString()
  label: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pauseMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SectionConfigDto)
  sections: SectionConfigDto[];
}

export class CreateSimulacroDto {
  @IsString()
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsEnum(ExamType)
  examType: ExamType;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SessionConfigDto)
  sessions: SessionConfigDto[];
}
