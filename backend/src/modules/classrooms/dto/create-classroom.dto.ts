import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateClassroomDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
