import { IsString, IsOptional } from 'class-validator';

export class AssignSimulacroDto {
  @IsString()
  userId: string;

  @IsString()
  simulacroId: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}
