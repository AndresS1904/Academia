import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class GenerateSimulacroDto {
  @IsString()
  templateId: string;

  @IsString()
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsString()
  schoolId?: string;

  // If true, returns a preview without persisting to DB
  @IsOptional()
  @IsBoolean()
  preview?: boolean;
}
