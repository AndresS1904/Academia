import { IsString, IsOptional, IsArray } from 'class-validator';

export class SubmitActivityDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileKeys?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileNames?: string[];
}
