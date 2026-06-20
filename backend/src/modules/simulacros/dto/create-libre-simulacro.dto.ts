import {
  IsString, IsOptional, IsBoolean, IsNumber, IsEnum,
  IsArray, ValidateNested, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum LibreCreationMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export class AreaConfigDto {
  @IsString()
  area: string;

  @IsNumber()
  @Min(1)
  @Max(200)
  count: number;

  @IsOptional()
  @IsString()
  difficulty?: string;
}

export class CreateLibreSimulacroDto {
  @IsString()
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsNumber()
  @Min(5)
  @Max(480)
  timeLimitMinutes: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  showResultsImmediately?: boolean;

  @IsOptional()
  @IsBoolean()
  allowBackNavigation?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsEnum(LibreCreationMode)
  mode: LibreCreationMode;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AreaConfigDto)
  autoConfig?: AreaConfigDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  questionIds?: string[];
}
