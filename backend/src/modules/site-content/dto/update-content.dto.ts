import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ContentType } from '@prisma/client';

export class UpdateSiteContentDto {
  @IsString()
  value: string;

  @IsEnum(ContentType)
  @IsOptional()
  type?: ContentType;
}
