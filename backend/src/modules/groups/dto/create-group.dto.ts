import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  isActive?: boolean;
}

export class AssignCourseDto {
  @IsString()
  courseId: string;
}

export class AssignSimulacroDto {
  @IsString()
  simulacroId: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class ImportOptionsDto {
  @IsOptional()
  updateExisting?: boolean;
}
