import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, IsUrl, MaxLength } from 'class-validator';
import { MaterialType } from '@prisma/client';

export class AddMaterialDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MaterialType)
  type: MaterialType;

  @IsOptional()
  @IsString()
  externalUrl?: string;

  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}
