import { IsString, IsOptional, IsNumber, MinLength, Min } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  order?: number;
}
