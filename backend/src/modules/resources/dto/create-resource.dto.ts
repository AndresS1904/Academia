import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ResourceType } from '@prisma/client';

export class CreateResourceDto {
  @IsString()
  title: string;

  @IsEnum(ResourceType)
  type: ResourceType;

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  filePath?: string;
}
