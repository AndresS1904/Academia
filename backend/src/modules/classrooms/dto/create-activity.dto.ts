import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString, MaxLength } from 'class-validator';

export class CreateActivityDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  maxScore?: number;

  @IsOptional()
  @IsBoolean()
  allowFiles?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
